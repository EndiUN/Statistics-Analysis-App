import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TouchableWithoutFeedback,
  Platform,
  ScrollView,
  Dimensions,
} from "react-native";
import React, { useCallback, useRef, useState } from "react";
import { AntDesign } from "@expo/vector-icons"; // Ensure expo/vector-icons is installed

type OptionItem = {
  value: string;
  label: string;
};

interface DropDownProps {
  data: OptionItem[];
  onChange: (value: string) => void;
  placeholder: string;
  label?: string; // Added label prop to match "Industry" text
  scrollRef?: React.RefObject<ScrollView>;
}

export default function Dropdown({
  data,
  onChange,
  placeholder,
  label,
  scrollRef,
}: DropDownProps) {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState("");
  const buttonRef = useRef<View>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const toggleExpanded = useCallback(() => {
    if (!expanded) {
      buttonRef.current?.measure((x, y, width, height, pageX, pageY) => {
        // 1. Get the total height of the device screen
        const windowHeight = Dimensions.get("window").height;
        const dropdownMaxHeight = 200; // Matches your FlatList's maxHeight

        // 2. Calculate how much space is left between the bottom of the button and the bottom of the screen
        const spaceBelow = windowHeight - (pageY + height);

        // 3. Decide whether to open UP or DOWN
        let topPosition = pageY + height + 5; // Default: open downwards

        // If space below is less than the dropdown height AND there's enough room above it, open UPwards instead
        if (spaceBelow < dropdownMaxHeight && pageY > dropdownMaxHeight) {
          topPosition = pageY - dropdownMaxHeight - 5;
        }

        setCoords({
          top: topPosition,
          left: pageX,
          width: width,
        });
        setExpanded(true);

        // (Optional) You can safely remove the scrollRef?.current?.scrollTo logic here
        // since the dropdown will now intelligently place itself where it fits!
      });
    } else {
      setExpanded(false);
    }
  }, [expanded]);
  const onSelect = useCallback(
    (item: OptionItem) => {
      onChange(item.value);
      setValue(item.label);
      setExpanded(false);
    },
    [onChange],
  );

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View ref={buttonRef} collapsable={false}>
        <TouchableOpacity
          style={[styles.button, expanded && styles.buttonActive]}
          activeOpacity={0.8}
          onPress={toggleExpanded}
        >
          <Text style={styles.text}>{value || placeholder}</Text>

          {/* Circular Arrow Container */}
          <View
            style={[styles.iconCircle, expanded && styles.iconCircleActive]}
          >
            <AntDesign
              name={expanded ? "up" : "down"}
              size={12}
              color={expanded ? "#324b50" : "#4d9bac"}
            />
          </View>
        </TouchableOpacity>

        {expanded && (
          <Modal
            visible={expanded}
            transparent
            animationType="none"
            statusBarTranslucent={true}
          >
            <TouchableWithoutFeedback onPress={() => setExpanded(false)}>
              <View style={styles.backdrop}>
                <View
                  style={[
                    styles.options,
                    { top: coords.top, left: coords.left, width: coords.width },
                  ]}
                  onStartShouldSetResponder={() => true}
                >
                  <FlatList
                    keyExtractor={(item) => item.value}
                    data={data}
                    style={{ maxHeight: 200 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={[
                          styles.optionItem,
                          value === item.label && styles.selectedOption,
                        ]}
                        onPress={() => onSelect(item)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            value === item.label && styles.selectedOptionText,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
    fontWeight: "500",
    marginLeft: 4,
  },
  button: {
    width: "100%",
    height: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#4d9bac", // Light gray border
  },
  buttonActive: {
    borderColor: "#33e0ff", // Blue border when open
    borderWidth: 2,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ecfcff", // Light gray circle
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircleActive: {
    backgroundColor: "#33e0ff", // Light blue circle
  },
  text: {
    fontSize: 16,
    color: "#111827",
  },
  backdrop: {
    flex: 1,
  },
  options: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 8,
    // Shadow for iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Elevation for Android
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  optionItem: {
    height: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  selectedOption: {
    backgroundColor: "#eff6ff", // Faint blue hover effect
  },
  optionText: {
    fontSize: 15,
    color: "#4b5563",
  },
  selectedOptionText: {
    color: "#2563eb",
    fontWeight: "500",
  },
});
