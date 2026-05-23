import React, { useState, useCallback } from "react";
import { View, Text, Switch, Button, StyleSheet } from "react-native";

/**
 * ChartControls Hook
 * Encapsulates all chart control logic including sorting, filtering, and tool toggles
 */
const useChartControls = (screenWidth = 800) => {
  const isMobile = screenWidth < 480;
  const isTablet = screenWidth >= 480 && screenWidth < 850;
  const isDesktop = screenWidth >= 850;

  const [isSortedBySize, setIsSortedBySize] = useState(false);
  const [isSortedByColor, setIsSortedByColor] = useState(false);
  const [hideGreenBars, setHideGreenBars] = useState(false);
  const [hidePurpleBars, setHidePurpleBars] = useState(false);
  const [showDotsOnly, setShowDotsOnly] = useState(false);
  const [valueToolActive, setValueToolActive] = useState(false);
  const [rangeToolActive, setRangeToolActive] = useState(false);

  const handleSortBySize = useCallback((isActive) => {
    setIsSortedBySize(isActive);
    if (isActive) setIsSortedByColor(false);
  }, []);

  const handleSortByColor = useCallback((isActive) => {
    setIsSortedByColor(isActive);
    if (isActive) setIsSortedBySize(false);
  }, []);

  // --- Render component with all controls ---
  const renderControls = useCallback(
    () => (
      <View
        style={[
          styles.controlsContainer,
          isDesktop && styles.controlsContainerDesktop,
        ]}
      >
        {/* Group 1: Tool toggles */}
        <View
          style={[
            styles.switchControlRow,
            isDesktop && styles.switchControlColumn,
          ]}
        >
          <View style={styles.switchItem}>
            <Text style={styles.switchLabel}>Value Tool</Text>
            <Switch
              value={valueToolActive}
              onValueChange={setValueToolActive}
            />
          </View>
          <View style={styles.switchItem}>
            <Text style={styles.switchLabel}>Range Tool</Text>
            <Switch
              value={rangeToolActive}
              onValueChange={setRangeToolActive}
            />
          </View>
        </View>

        {/* Group 2: Visibility filters */}
        <View
          style={[
            styles.switchControlRow,
            isDesktop && styles.switchControlColumn,
            isDesktop && styles.groupSeparator,
          ]}
        >
          <View style={styles.switchItem}>
            <Text style={styles.switchLabel}>Hide Green</Text>
            <Switch value={hideGreenBars} onValueChange={setHideGreenBars} />
          </View>
          <View style={styles.switchItem}>
            <Text style={styles.switchLabel}>Hide Purple</Text>
            <Switch value={hidePurpleBars} onValueChange={setHidePurpleBars} />
          </View>
          <View style={styles.switchItem}>
            <Text style={styles.switchLabel}>Dots Only</Text>
            <Switch value={showDotsOnly} onValueChange={setShowDotsOnly} />
          </View>
        </View>

        {/* Group 3: Sorting buttons */}
        <View
          style={[
            styles.buttonControlRow,
            isDesktop && styles.buttonControlColumn,
            isDesktop && styles.groupSeparator,
          ]}
        >
          <View
            style={[styles.buttonItem, isDesktop && styles.buttonItemDesktop]}
          >
            <Button
              title="Sort by Color"
              onPress={() => handleSortByColor(!isSortedByColor)}
            />
          </View>
          <View
            style={[styles.buttonItem, isDesktop && styles.buttonItemDesktop]}
          >
            <Button
              title="Sort by Size"
              onPress={() => handleSortBySize(!isSortedBySize)}
            />
          </View>
        </View>
      </View>
    ),
    [
      valueToolActive,
      rangeToolActive,
      hideGreenBars,
      hidePurpleBars,
      showDotsOnly,
      isSortedByColor,
      isSortedBySize,
      isDesktop,
      handleSortByColor,
      handleSortBySize,
    ],
  );

  return {
    // State
    isSortedBySize,
    isSortedByColor,
    hideGreenBars,
    hidePurpleBars,
    showDotsOnly,
    valueToolActive,
    rangeToolActive,

    // Setters
    setIsSortedBySize,
    setIsSortedByColor,
    setHideGreenBars,
    setHidePurpleBars,
    setShowDotsOnly,
    setValueToolActive,
    setRangeToolActive,

    // Render function
    renderControls,
  };
};

const styles = StyleSheet.create({
  controlsContainer: {
    flexDirection: "column",
    width: "100%",
    marginBottom: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  switchControlRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  switchItem: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
    textAlign: "center",
  },
  buttonControlRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
    borderTopWidth: 1,
    borderColor: "#e0e0e0",
  },
  buttonItem: {
    flex: 1,
    minHeight: 44,
    maxWidth: 150,
  },
  // --- Desktop Styles ---
  controlsContainerDesktop: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 20,
    gap: 30,
  },
  switchControlColumn: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 0,
    flex: 1,
  },
  buttonControlColumn: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 0,
    flex: 1,
    borderTopWidth: 0,
  },
  groupSeparator: {
    borderLeftWidth: 1,
    borderLeftColor: "#e0e0e0",
    paddingLeft: 20,
    marginLeft: 20,
  },
  buttonItemDesktop: {
    width: "100%",
    minHeight: 40,
  },
});

export default useChartControls;
