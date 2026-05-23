import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Dimensions,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from "react-native";
import InfoModal from "../modals/InfoModal";
import Dropdown from "../../../components/dropDown";

const ScatterControls = ({
  isMobile = false,
  showCross,
  onShowCrossChange,
  hideData,
  onHideDataChange,
  activeGrid,
  onActiveGridChange,
  twoGroupsCount,
  onTwoGroupsChange,
  fourGroupsCount,
  onFourGroupsChange,
  scrollRef,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", message: "" });

  const groupOptions = [
    { label: "Off", value: null },
    ...Array.from({ length: 7 }, (_, i) => ({
      label: `${i + 4}`,
      value: i + 4,
    })),
  ];

  const gridOptions = [
    { label: "Off", value: null },
    ...Array.from({ length: 8 }, (_, i) => ({
      label: `${i + 3}×${i + 3}`,
      value: i + 3,
    })),
  ];

  const handleInfoPress = (title, message) => {
    setModalContent({ title, message });
    setModalVisible(true);
  };

  const DropdownItem = ({
    label,
    infoTitle,
    infoBody,
    options,
    value,
    onSelect,
  }) => {
    const [expanded, setExpanded] = useState(false);
    const [dropdownTop, setDropdownTop] = useState(0);
    const [dropdownWidth, setDropdownWidth] = useState(0);
    const [dropdownLeft, setDropdownLeft] = useState(0);

    const buttonRef = useRef(null);

    const selectedLabel = options?.find((o) => o.value === value)?.label;
    const headerLabel = selectedLabel
      ? `${label}: ${selectedLabel}`
      : `${label}: Off`;

    const toggleDropdown = () => {
      if (!expanded) {
        // Measure the button's position on the screen before opening
        buttonRef.current.measure((x, y, width, height, pageX, pageY) => {
          setDropdownTop(pageY + height); // Position list exactly below button
          setDropdownLeft(pageX);
          setDropdownWidth(width);
          setExpanded(true);
        });
      } else {
        setExpanded(false);
      }
    };

    return (
      <View style={[styles.dropdownRow, isMobile && styles.dropdownRowMobile]}>
        {/* 1. Info Icon */}
        <TouchableOpacity
          style={styles.infoCircle}
          onPress={() => {
            handleInfoPress(label, infoBody);
          }}
        >
          <Text style={styles.infoText}>i</Text>
        </TouchableOpacity>

        {/* <View style={styles.dropdownWrapper} ref={buttonRef}>
          <TouchableOpacity
            style={styles.dropdownHeader}
            activeOpacity={0.8}
            onPress={toggleDropdown}
          >
            <Text style={styles.headerText}>{headerLabel} ▼</Text>
          </TouchableOpacity>
        </View> */}
        <View style={styles.dropdownWrapper}>
          <Dropdown
            data={options}
            onChange={onSelect}
            placeholder={headerLabel}
            scrollRef={scrollRef}
          />
        </View>
      </View>
    );
  };

  return (
    <View
      style={[styles.mainContainer, isMobile && styles.mainContainerMobile]}
    >
      {/* Left Column: Switches */}
      <View
        style={[styles.switchColumn, isMobile && styles.switchColumnMobile]}
      >
        <View style={styles.switchGroup}>
          <Text style={[styles.label, isMobile && styles.labelMobile]}>
            Show Cross
          </Text>
          <Switch
            value={showCross}
            onValueChange={onShowCrossChange}
            style={[!isMobile && { transform: [{ scale: 1.2 }] }]}
          />
        </View>

        <View style={styles.switchGroup}>
          <Text style={[styles.label, isMobile && styles.labelMobile]}>
            Hide Data
          </Text>
          <Switch
            value={hideData}
            onValueChange={onHideDataChange}
            style={[!isMobile && { transform: [{ scale: 1.2 }] }]}
          />
        </View>
      </View>

      {/* Right Column: Dropdowns */}
      <View
        style={[styles.dropdownColumn, isMobile && styles.dropdownColumnMobile]}
      >
        <DropdownItem
          label="Two Groups"
          infoTitle="Two Equal Groups"
          infoBody="Divides plot into groups + shows median, low, and high values."
          options={groupOptions}
          value={twoGroupsCount}
          onSelect={onTwoGroupsChange}
        />
        <DropdownItem
          label="Four Groups"
          infoTitle="Four Equal Groups"
          infoBody="Divides plot into groups + shows median, low, high, and quartiles."
          options={groupOptions}
          value={fourGroupsCount}
          onSelect={onFourGroupsChange}
        />
        <DropdownItem
          label="Grids"
          infoTitle="Grids Mode"
          infoBody="Divides plot into grid groups with full statistical markers."
          options={gridOptions}
          value={activeGrid}
          onSelect={onActiveGridChange}
        />
      </View>

      {/* 3. THE MODAL (Placed at the bottom of JSX) */}
      <InfoModal
        visible={modalVisible}
        title={modalContent.title}
        message={modalContent.message}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 150,
  },
  mainContainer: {
    flexDirection: "row", // Side-by-side layout
    //width: "100%",
    marginHorizontal: 62,
    backgroundColor: "#e6f4f1",
    borderWidth: 2,
    borderColor: "#00405b",
    borderRadius: 20,
    alignItems: "flex-start",
    zIndex: 1,
    overflow: "visible",
  },
  mainContainerMobile: {
    marginHorizontal: 10,
    minHeight: 400,
    flexDirection: "column",
    //alignItems: "stretch",
    paddingHorizontal: 10,
  },
  /* --- Left Column (desktop) / Switches row (mobile) --- */
  switchColumn: {
    flex: 1,
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingVertical: 63,
  },
  switchColumnMobile: {
    width: "100%",
    flex: undefined,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderRightWidth: 0,
    borderBottomWidth: 2,
    borderBottomColor: "#00405b",
    paddingTop: 5,
    paddingBottom: 0,
  },
  switchGroup: {
    alignItems: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 18,
    color: "#002e48",
    marginBottom: 5,
    fontWeight: "600",
  },
  labelMobile: {
    fontSize: 12,
  },
  /* --- Right Column (desktop) / Dropdowns column (mobile) --- */
  dropdownColumn: {
    flex: 2,
    paddingTop: 20,
    paddingBottom: 0,
    paddingVertical: 20,
    justifyContent: "space-around",
    overflow: "visible",
    borderLeftWidth: 2,
    borderLeftColor: "#00405b",
  },
  dropdownColumnMobile: {
    justifyContent: "space-evenly",
    width: "100%",
    //flex: undefined,
    flexDirection: "column",
    paddingVertical: 5,
    borderLeftWidth: 0,
  },
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 62,
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownRowMobile: {
    marginBottom: 0,
    paddingTop: 0,
    paddingHorizontal: 0,
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoCircle: {
    width: 35,
    height: 35,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "#e0f2fe",
    borderColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 10,
  },
  infoText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "bold",
    fontStyle: "italic",
  },
  dropdownWrapper: {
    flex: 1, // Takes up remaining space
  },
  dropdownHeader: {
    height: 45,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  headerText: {
    fontSize: 14,
    color: "#333",
  },
  /* --- Modal Styles --- */
  modalOverlay: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  modalOptions: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#eee",
    maxHeight: 200,
    overflow: "hidden",
  },
  optionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
  },
  itemText: {
    color: "#2563eb",
    fontSize: 14,
  },
});
// const styles = StyleSheet.create({
//   footer: {
//     flexDirection: "row",
//     alignItems: "center", // Centers them vertically relative to each other
//     justifyContent: "space-between",
//     paddingHorizontal: 20,
//     marginTop: 20,
//     width: "100%",
//     zIndex: 10, // Ensure the dropdown inside can float
//   },
//   leftColumn: {
//     flex: 1, // Takes up the available space on the left
//     paddingRight: 10,
//   },
//   rightColumn: {
//     flex: 1,
//     alignItems: "flex-end", // Pushes the dropdown to the right edge
//   },
//   descriptionTitle: {
//     fontSize: 16,
//     fontWeight: "bold",
//     color: "#333",
//   },
//   descriptionSub: {
//     fontSize: 12,
//     color: "#666",
//     marginTop: 2,
//   },
//   dropdownContainer: {
//     width: 150, // Slightly smaller for the side-bar look
//     position: "relative",
//     zIndex: 100,
//   },
//   dropdownHeader: {
//     backgroundColor: "#fff",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     padding: 10,
//     borderRadius: 8,
//     width: "100%",
//   },
//   dropdownList: {
//     position: "absolute",
//     // We use 'bottom: 45' if you want it to open UPWARD
//     // or 'top: 45' to open DOWNWARD
//     top: 45,
//     right: 0,
//     width: "100%",
//     backgroundColor: "#fff",
//     borderWidth: 1,
//     borderColor: "#ccc",
//     borderRadius: 8,
//     elevation: 5,
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     zIndex: 1000,
//   },
// });
export default ScatterControls;
