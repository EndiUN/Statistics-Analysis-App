import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  Platform,
  StatusBar,
  Modal,
  Button,
  TextInput,
  Alert,
  TouchableOpacity,
} from "react-native";
import {
  GestureHandlerRootView,
  ScrollView,
} from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import { useRouter } from "expo-router";
import Svg, { Line, G, Text as SvgText } from "react-native-svg";
import axios from "axios";
import initialBatteryData from "../../data/batteryScenario_set.json";
import BatteryBar from "./minitool_one_components/BatteryBar";
import useValueTool from "./tools/ValueTool";
import useRangeTool from "./tools/RangeTool";
import useChartControls from "./controls/ChartControls";
import useDataGenerationModal from "./modals/DataGenerationModal";
import useBarGenerationModal from "./modals/BarGenerationModal";
import UploadScenarioModal from "../../components/UploadScenarioModal";
import BarInfoModal from "./modals/BarInfoModal";
import useDimensions from "../hooks/useDimensions";
import UniverseButton from "../../components/universeButton";
import Dropdown from "../../components/dropDown";
import { scaleLinear } from "d3-scale";
import {
  TOUGH_CELL_COLOR,
  ALWAYS_READY_COLOR,
  AXIS_COLOR,
  TOOL_COLOR,
  RANGE_TOOL_COLOR,
  RANGE_HANDLE_SIZE,
  MAX_BAR_COUNT,
  PADDING,
  Y_AXIS_WIDTH,
  BAR_HEIGHT,
  BAR_SPACING,
  X_AXIS_HEIGHT,
  TOOL_LABEL_OFFSET_Y,
  RANGE_LABEL_OFFSET_Y,
  TOP_BUFFER,
  SIDEBAR_WIDTH,
  API_URL,
} from "./constants";

// --- Local Scenarios (always available) ---
const LOCAL_SCENARIOS = [
  {
    id: "local_initial",
    name: "Default Battery Data",
    data: initialBatteryData,
  },
];

const Minitool_1 = () => {
  const { width } = useDimensions();
  const router = useRouter();
  const [currentBatteryData, setCurrentBatteryData] =
    useState(initialBatteryData);
  const [toolValue, setToolValue] = useState(80.0);
  const [rangeCount, setRangeCount] = useState(0);
  const [isHelpVisible, setIsHelpVisible] = useState(false);

  // --- Responsive Layout ---
  const { isMobile, isTablet, isDesktop, EFFECTIVE_SIDEBAR_WIDTH } =
    useMemo(() => {
      const mobile = width <= 480;
      const tablet = width > 480 && width < 850;
      const desktop = width >= 850;
      let sidebarWidth = SIDEBAR_WIDTH;
      if (mobile) sidebarWidth = 0;
      else if (tablet) sidebarWidth = 100;
      return {
        isMobile: mobile,
        isTablet: tablet,
        isDesktop: desktop,
        EFFECTIVE_SIDEBAR_WIDTH: sidebarWidth,
      };
    }, [width]);

  // --- Database state ---
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [showScenariosModal, setShowScenariosModal] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [loadedScenarioName, setLoadedScenarioName] = useState(null);

  // --- Bar Info Modal state ---
  const [selectedBar, setSelectedBar] = useState(null);
  const [isBarInfoModalVisible, setIsBarInfoModalVisible] = useState(false);

  // --- Upload Modal state ---
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);

  // --- Chart Controls ---
  const chartControls = useChartControls(width);

  // --- Derived displayed data (replaces useEffect + setState for better perf) ---
  const displayedData = useMemo(() => {
    let data = [...currentBatteryData];

    if (chartControls.isSortedBySize) {
      data.sort((a, b) => b.lifespan - a.lifespan);
    } else if (chartControls.isSortedByColor) {
      data.sort((a, b) => a.brand.localeCompare(b.brand));
    }

    return data.map((item) => ({
      ...item,
      visible:
        !(chartControls.hideGreenBars && item.brand === "Tough Cell") &&
        !(chartControls.hidePurpleBars && item.brand === "Always Ready"),
    }));
  }, [
    currentBatteryData,
    chartControls.isSortedBySize,
    chartControls.isSortedByColor,
    chartControls.hideGreenBars,
    chartControls.hidePurpleBars,
  ]);

  // --- Computed stats ---
  const { barCount, minLifespan, maxLifespan } = useMemo(() => {
    const visible = displayedData.filter((item) => item.visible);
    if (visible.length === 0)
      return { barCount: 0, minLifespan: 0, maxLifespan: 0 };
    const lifespans = visible.map((item) => item.lifespan);
    return {
      barCount: visible.length,
      minLifespan: lifespans.reduce((m, v) => Math.min(m, v), Infinity),
      maxLifespan: lifespans.reduce((m, v) => Math.max(m, v), -Infinity),
    };
  }, [displayedData]);

  // --- Chart dimensions ---
  const {
    chartHeight,
    SVG_HEIGHT,
    SVG_WIDTH,
    chartWidth,
    dynamicMax,
    xScale,
    TICK_FONT_SIZE,
  } = useMemo(() => {
    // Data-driven height: sized to actual bar count, not fixed 20
    const height = Math.max(10, barCount * (BAR_HEIGHT + 2 * BAR_SPACING));
    const svgHeight = height + X_AXIS_HEIGHT + TOP_BUFFER;

    const maxValInData =
      displayedData.length > 0
        ? displayedData.reduce((m, d) => Math.max(m, d.lifespan), 0)
        : 100;
    const dynMax = maxValInData * 1.01;

    const sidebarMargins = isDesktop ? 20 : 0;
    const available =
      width - PADDING * 2 - EFFECTIVE_SIDEBAR_WIDTH - sidebarMargins;
    const svgWidth =
      isMobile || isTablet ? Math.max(available, 500) : available;
    const cWidth = svgWidth - 80;

    // Linear scale: domain [0, dynMax] -> range [0, cWidth]
    const scale = scaleLinear().domain([0, dynMax]).range([0, cWidth]);

    let tickFontSize = "12";
    if (isMobile) tickFontSize = "10";
    else if (isTablet) tickFontSize = "11";

    return {
      chartHeight: height,
      SVG_HEIGHT: svgHeight,
      SVG_WIDTH: svgWidth,
      chartWidth: cWidth,
      dynamicMax: dynMax,
      xScale: scale,
      TICK_FONT_SIZE: tickFontSize,
    };
  }, [
    width,
    isDesktop,
    isTablet,
    isMobile,
    EFFECTIVE_SIDEBAR_WIDTH,
    displayedData,
    barCount,
  ]);

  // --- Initial tool positions (using scale) ---
  const { initialTranslateX, initialRangeStartX, initialRangeEndX } = useMemo(
    () => ({
      initialTranslateX: xScale(80.0),
      initialRangeStartX: xScale(52),
      initialRangeEndX: xScale(56),
    }),
    [xScale],
  );

  // --- Value Tool ---
  const valueTool = useValueTool({
    isActive: chartControls.valueToolActive,
    onActiveChange: chartControls.setValueToolActive,
    onValueChange: setToolValue,
    chartWidth,
    chartHeight,
    maxLifespan: dynamicMax,
    toolValue,
    toolColor: TOOL_COLOR,
    X_AXIS_HEIGHT,
    TOP_BUFFER,
  });

  // --- Range Tool ---
  const rangeTool = useRangeTool({
    isActive: chartControls.rangeToolActive,
    onActiveChange: chartControls.setRangeToolActive,
    onCountChange: setRangeCount,
    chartWidth,
    chartHeight,
    maxLifespan: dynamicMax,
    initialStartValue: 52,
    initialEndValue: 56,
    rangeHandleSize: RANGE_HANDLE_SIZE,
    rangeToolColor: RANGE_TOOL_COLOR,
    displayedData,
    X_AXIS_HEIGHT,
    TOP_BUFFER,
  });

  // --- Reset tool positions helper ---
  const resetToolPositions = useCallback(() => {
    valueTool.translateX.value = initialTranslateX;
    rangeTool.rangeStartX.value = initialRangeStartX;
    rangeTool.rangeEndX.value = initialRangeEndX;
  }, [
    initialTranslateX,
    initialRangeStartX,
    initialRangeEndX,
    valueTool,
    rangeTool,
  ]);

  // --- Data Generation Modal ---
  const dataGenerationModal = useDataGenerationModal({
    onDataGenerated: (data) => {
      setCurrentBatteryData(data);
      chartControls.setIsSortedByColor(false);
      chartControls.setIsSortedBySize(false);
    },
    onClose: resetToolPositions,
  });

  // --- Bar Generation Modal ---
  const barGenerationModal = useBarGenerationModal({
    onBarAdded: (newBar) => {
      setCurrentBatteryData([...currentBatteryData, newBar]);
    },
    onClose: resetToolPositions,
    currentBarCount: currentBatteryData.length,
    MAX_BAR_COUNT,
  });

  // --- Upload handler ---
  const handleUploadSuccess = useCallback(
    (newScenario) => {
      const batteryData = newScenario?.data?.dataPoints ?? [];
      setCurrentBatteryData(batteryData);
      setLoadedScenarioName(newScenario?.name ?? "Unnamed");
      setSelectedScenarioId(newScenario?._id ?? null);
      chartControls.setIsSortedByColor(false);
      chartControls.setIsSortedBySize(false);
      fetchScenarios();
      setIsUploadModalVisible(false);
    },
    [chartControls],
  );

  // --- Fetch scenarios on mount ---
  useEffect(() => {
    fetchScenarios();
  }, []);

  // --- Handlers ---
  const handleAddBarButtonPress = useCallback(() => {
    chartControls.setRangeToolActive(false);
    chartControls.setValueToolActive(false);
    barGenerationModal.handleOpenModal();
  }, [chartControls, barGenerationModal]);

  const handleBarPress = useCallback((index, item) => {
    setSelectedBar({ brand: item.brand, lifespan: item.lifespan });
    setIsBarInfoModalVisible(true);
  }, []);

  const handleDeleteBar = useCallback(() => {
    if (!selectedBar) return;
    const actualIndex = currentBatteryData.findIndex(
      (item) =>
        item.brand === selectedBar.brand &&
        item.lifespan === selectedBar.lifespan,
    );
    if (actualIndex !== -1) {
      setCurrentBatteryData(
        currentBatteryData.filter((_, idx) => idx !== actualIndex),
      );
    }
    setIsBarInfoModalVisible(false);
    setSelectedBar(null);
  }, [selectedBar, currentBatteryData]);

  const handleCloseBarInfoModal = useCallback(() => {
    setIsBarInfoModalVisible(false);
    setSelectedBar(null);
  }, []);

  // --- Database Functions ---
  const fetchScenarios = async () => {
    try {
      const response = await axios.get(API_URL);
      if (response.data.success) {
        const filteredScenarios = response.data.data.filter(
          (scenario) => scenario.toolType === "minitool1",
        );
        setScenarios(filteredScenarios);
      }
    } catch (error) {
      console.error("Error fetching scenarios:", error);
      if (error.code === "ERR_NETWORK") {
        alert(
          "Connection Error. Unable to connect to database. Make sure the backend server is running on port 5000.",
        );
      } else {
        alert("Error. Failed to fetch scenarios from database");
      }
    }
  };

  const saveScenario = async () => {
    if (!scenarioName.trim()) {
      alert("Input Error. Please enter a scenario name");
      return;
    }

    try {
      setIsSavingScenario(true);
      const payload = {
        name: scenarioName,
        description: "",
        toolType: "minitool1",
        data: {
          bars: currentBatteryData,
          minLifespan: barCount > 0 ? minLifespan : null,
          maxLifespan: barCount > 0 ? maxLifespan : null,
        },
      };

      const response = await axios.post(API_URL, payload);

      if (response.data.success) {
        alert("Success. Scenario saved successfully");
        setScenarios([...scenarios, response.data.data]);

        // Reset UI state
        setScenarioName("");
        setShowScenariosModal(false);
      }
    } catch (error) {
      if (error.response) {
        console.error("Server Error Data:", error.response.data);
      }
      if (error.response) {
        console.error("Server Error Data:", error.response.data);
      }
      console.error("Error saving scenario:", error);
      alert("Error. Failed to save scenario to database");
    } finally {
      setIsSavingScenario(false);
    }
  };

  const handleLoadScenarioFromDropdown = useCallback(
    async (scenarioId) => {
      if (!scenarioId) return;

      // Check if it's a local scenario
      if (scenarioId.startsWith("local_")) {
        const localScenario = LOCAL_SCENARIOS.find((s) => s.id === scenarioId);
        if (localScenario) {
          setCurrentBatteryData(localScenario.data);
          setLoadedScenarioName(localScenario.name);
          setSelectedScenarioId(scenarioId);
          chartControls.setIsSortedByColor(false);
          chartControls.setIsSortedBySize(false);
        }
        return;
      }

      // Load from database
      try {
        const response = await axios.get(`${API_URL}/${scenarioId}`);
        if (response.data.success) {
          const scenarioData = response.data.data;
          const bars = scenarioData?.data?.bars ?? [];
          setCurrentBatteryData(bars);
          setLoadedScenarioName(scenarioData?.name ?? "Unnamed");
          setSelectedScenarioId(scenarioId);
          chartControls.setIsSortedByColor(false);
          chartControls.setIsSortedBySize(false);
        } else {
          alert(
            "Failed to load scenario: " +
              (response.data.error || "Unknown error"),
          );
        }
      } catch (error) {
        console.error("Error loading scenario:", error);
        alert("Error loading scenario: " + error.message);
      }
    },
    [chartControls],
  );

  const deleteScenario = async (scenarioId) => {
    const executeDeletion = async () => {
      try {
        const response = await axios.delete(`${API_URL}/${scenarioId}`);
        if (response.data.success) {
          setScenarios((prev) => prev.filter((s) => s._id !== scenarioId));
          if (selectedScenarioId === scenarioId) {
            setSelectedScenarioId(null);
            router.replace("/minitool_1");
          }
          if (Platform.OS === "web") {
            window.alert("Success: Scenario deleted successfully");
          } else {
            Alert.alert("Success", "Scenario deleted successfully");
          }
        }
      } catch (error) {
        console.error("Error deleting scenario:", error);
        if (Platform.OS === "web") {
          window.alert("Error: Failed to delete scenario");
        } else {
          Alert.alert("Error", "Failed to delete scenario");
        }
      }
    };

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Are you sure you want to delete this scenario?",
      );
      if (confirmed) await executeDeletion();
    } else {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this scenario?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", onPress: executeDeletion, style: "destructive" },
        ],
      );
    }
  };

  // --- Memoized tick labels (nice values) ---
  const tickLabels = useMemo(() => {
    const tickCount = isMobile ? 4 : isTablet ? 6 : 10;
    const ticks = xScale.ticks(tickCount);
    const yPos = chartHeight + X_AXIS_HEIGHT + TOP_BUFFER / 2;
    return ticks.map((val, i) => ({
      key: `label-${i}`,
      x: xScale(val),
      y: yPos,
      value: Math.round(val),
    }));
  }, [dynamicMax, chartWidth, chartHeight, isMobile, isTablet, xScale]);

  // --- Memoized visible bars (uses visible-only index for positioning) ---
  const visibleBarsToRender = useMemo(() => {
    return displayedData
      .filter((item) => item.visible)
      .map((item, visibleIndex) => ({ item, index: visibleIndex }));
  }, [displayedData]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Battery Lifespan Comparison</Text>

        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendColorBox,
                { backgroundColor: TOUGH_CELL_COLOR },
              ]}
            />
            <Text>Tough Cell</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendColorBox,
                { backgroundColor: ALWAYS_READY_COLOR },
              ]}
            />
            <Text>Always Ready</Text>
          </View>
        </View>

        {/* --- Collapsible Help Section --- */}
        <View style={styles.collapsibleContainer}>
          <TouchableOpacity
            onPress={() => setIsHelpVisible(!isHelpVisible)}
            style={styles.collapsibleHeader}
          >
            <Text style={styles.collapsibleHeaderText}>
              {isHelpVisible ? "▼" : "►"} About This Battery Chart
            </Text>
          </TouchableOpacity>
          {isHelpVisible && (
            <View style={styles.collapsibleContent}>
              <Text style={[styles.helpSectionTitle, { marginTop: 0 }]}>
                What is this?
              </Text>
              <Text style={styles.helpText}>
                This chart displays the lifespans, in hours, for batteries from
                two different brands: Tough Cell{" "}
                <Text style={{ color: "#33cc33", fontSize: 15 }}>■</Text> and
                Always Ready{" "}
                <Text style={{ color: "#cc00ff", fontSize: 15 }}>■</Text>.
              </Text>

              <Text style={styles.helpSectionTitle}>Why is it useful?</Text>
              <Text style={styles.helpText}>
                Comparing the two sets of data helps to visually determine if
                one brand generally offers a longer lifespan than the other. You
                can see how the lifespans are distributed and identify outliers.
              </Text>

              <Text style={styles.helpSectionTitle}>What can you do?</Text>
              <View style={styles.helpList}>
                <Text style={styles.helpListItem}>
                  - Toggle the switches to{" "}
                  <Text style={styles.helpTextBold}>Sort</Text> the batteries by
                  lifespan (size) or by brand (color).
                </Text>
                <Text style={styles.helpListItem}>
                  - Enable the{" "}
                  <Text style={styles.helpTextBold}>'Value tool'</Text> and drag
                  the red line to see the exact lifespan value at any point.
                </Text>
                <Text style={styles.helpListItem}>
                  - Enable the{" "}
                  <Text style={styles.helpTextBold}>'Range tool'</Text> to
                  select a specific lifespan range. Drag the handles to resize
                  the range or drag the middle to move it. The count of
                  batteries within the range appears at the top.
                </Text>
                <Text style={styles.helpListItem}>
                  - Use the buttons at the bottom to{" "}
                  <Text style={styles.helpTextBold}>Add</Text> a new battery,{" "}
                  <Text style={styles.helpTextBold}>Remove</Text> the last one,
                  or <Text style={styles.helpTextBold}>Generate</Text> a whole
                  new set of random data.
                </Text>
              </View>
            </View>
          )}
        </View>

        <View
          style={[
            styles.scenarioLoaderContainer,
            isMobile && styles.scenarioLoaderMobile,
            isTablet && styles.scenarioLoaderTablet,
          ]}
        >
          {/* --- Scenario Picker Dropdown --- */}
          <View
            style={[
              styles.scenarioPickerContainer,
              isMobile && styles.scenarioPickerMobile,
              isTablet && styles.scenarioPickerTablet,
            ]}
          >
            <Dropdown
              data={[
                ...LOCAL_SCENARIOS.map((scenario) => ({
                  label: scenario.name,
                  value: scenario.id,
                })),
                ...scenarios.map((scenario) => ({
                  label: scenario.name,
                  value: scenario._id,
                })),
              ]}
              onChange={handleLoadScenarioFromDropdown}
              placeholder="Select scenario"
            />
          </View>

          {/* Buttons Layout */}
          <View
            style={[
              styles.topButtonsContainer,
              isMobile && styles.topButtonsContainerMobile,
              isTablet && styles.topButtonsContainerTablet,
            ]}
          >
            <UniverseButton
              title="Upload"
              onPress={() => setIsUploadModalVisible(true)}
              colorScheme="primary"
              containerStyles={
                isMobile
                  ? styles.topButtonMobile
                  : isTablet
                    ? styles.topButtonTablet
                    : styles.topButton
              }
            />
            <UniverseButton
              title="ADD BAR"
              onPress={handleAddBarButtonPress}
              colorScheme="primary"
              containerStyles={
                isMobile
                  ? styles.topButtonMobile
                  : isTablet
                    ? styles.topButtonTablet
                    : styles.topButton
              }
            />
            <UniverseButton
              title="Generate"
              onPress={() => {
                chartControls.setRangeToolActive(false);
                chartControls.setValueToolActive(false);
                dataGenerationModal.handleOpenModal();
              }}
              colorScheme="primary"
              containerStyles={
                isMobile
                  ? styles.topButtonMobile
                  : isTablet
                    ? styles.topButtonTablet
                    : styles.topButton
              }
            />
          </View>
        </View>

        {/* Bar chart with tools */}
        {!dataGenerationModal.isModalVisible &&
          !barGenerationModal.isModalVisible && (
            <View
              style={[
                styles.chartAndStatsContainer,
                isMobile && styles.chartAndStatsMobile,
              ]}
            >
              <ScrollView
                horizontal={true}
                scrollEnabled={SVG_WIDTH > width - EFFECTIVE_SIDEBAR_WIDTH}
                style={[styles.chartContainer, { flex: 1, width: "100%" }]}
                contentContainerStyle={{
                  width: SVG_WIDTH + Y_AXIS_WIDTH,
                  paddingRight: 0,
                }}
              >
                <View
                  style={{
                    width: SVG_WIDTH + Y_AXIS_WIDTH,
                    height: SVG_HEIGHT + X_AXIS_HEIGHT,
                  }}
                >
                  {/* Value tool label */}
                  <Animated.View
                    style={[
                      styles.toolLabelContainer,
                      valueTool.animatedLabelStyle,
                    ]}
                  >
                    <Text style={styles.toolLabelText}>
                      {toolValue.toFixed(1)}
                    </Text>
                  </Animated.View>

                  {/* Range tool label */}
                  <Animated.View
                    style={[
                      styles.rangeLabelContainer,
                      rangeTool.animatedRangeLabelStyle,
                    ]}
                  >
                    <Text style={styles.rangeLabelText}>
                      count: {rangeCount}
                    </Text>
                  </Animated.View>

                  {/* SVG Chart */}
                  <Svg
                    width={SVG_WIDTH + Y_AXIS_WIDTH}
                    height={SVG_HEIGHT + X_AXIS_HEIGHT}
                    style={{ zIndex: 1 }}
                  >
                    <G>
                      {/* X-Axis */}
                      <Line
                        x1="0"
                        y1={chartHeight + X_AXIS_HEIGHT + TOP_BUFFER}
                        x2={chartWidth}
                        y2={chartHeight + X_AXIS_HEIGHT + TOP_BUFFER}
                        stroke={AXIS_COLOR}
                        strokeWidth="1"
                      />
                      {tickLabels.map(({ key, x, y, value }) => (
                        <SvgText
                          key={key}
                          x={x + 5}
                          y={y + TOP_BUFFER}
                          fill={AXIS_COLOR}
                          fontSize={TICK_FONT_SIZE}
                          textAnchor="middle"
                        >
                          {value}
                        </SvgText>
                      ))}

                      {/* Data Bars */}
                      {visibleBarsToRender.map(({ item, index }) => (
                        <BatteryBar
                          key={`bar-${index}-${item.lifespan}`}
                          item={item}
                          index={index}
                          chartWidth={chartWidth}
                          rangeStartX={rangeTool.rangeStartX}
                          rangeEndX={rangeTool.rangeEndX}
                          tool={chartControls.rangeToolActive}
                          dotsOnly={chartControls.showDotsOnly}
                          MAX_LIFESPAN={dynamicMax}
                          onBarPress={handleBarPress}
                          TOP_BUFFER={TOP_BUFFER}
                        />
                      ))}

                      {/* Range tool */}
                      {rangeTool.renderRangeTool()}

                      {/* Value tool */}
                      {valueTool.renderValueTool()}

                      {/* Y-Axis */}
                      <Line
                        x1={0}
                        y1={0}
                        x2={0}
                        y2={chartHeight + X_AXIS_HEIGHT + TOP_BUFFER}
                        stroke={AXIS_COLOR}
                        strokeWidth="1"
                      />
                    </G>
                  </Svg>
                </View>
              </ScrollView>

              {/* --- Stats Section --- */}
              {isMobile ? (
                <View testID="mobile-stats-bar" style={styles.statsBarMobile}>
                  <View style={styles.statItemMobile}>
                    <Text style={styles.statLabelMobile}>Amount</Text>
                    <Text
                      testID="mobile-stat-amount"
                      style={styles.statValueMobile}
                    >
                      {barCount}
                    </Text>
                  </View>
                  <View style={[styles.statItemMobile, styles.statItemBorder]}>
                    <Text style={styles.statLabelMobile}>Min</Text>
                    <Text
                      testID="mobile-stat-min"
                      style={styles.statValueMobile}
                    >
                      {minLifespan}
                    </Text>
                  </View>
                  <View style={styles.statItemMobile}>
                    <Text style={styles.statLabelMobile}>Max</Text>
                    <Text
                      testID="mobile-stat-max"
                      style={styles.statValueMobile}
                    >
                      {maxLifespan}
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  testID="stats-bar"
                  style={[
                    styles.statsSidebar,
                    {
                      width: EFFECTIVE_SIDEBAR_WIDTH,
                      height: Math.max(SVG_HEIGHT, 250),
                      padding: isTablet ? 10 : 15,
                      marginTop: X_AXIS_HEIGHT / 2,
                    },
                  ]}
                >
                  <View style={styles.statsSidebarCenter}>
                    <Text
                      style={[
                        styles.statLabel,
                        { fontSize: isTablet ? 10 : 12 },
                      ]}
                    >
                      Amount
                    </Text>
                    <Text
                      testID="stat-amount"
                      style={[
                        styles.statAmountValue,
                        { fontSize: isTablet ? 24 : 32 },
                      ]}
                    >
                      {barCount}
                    </Text>
                  </View>

                  <View style={styles.statsSidebarBottom}>
                    <View style={{ marginBottom: 8 }}>
                      <Text
                        style={[
                          styles.statMinMaxLabel,
                          { fontSize: isTablet ? 9 : 11 },
                        ]}
                      >
                        Min
                      </Text>
                      <Text
                        testID="stat-min"
                        style={[
                          styles.statMinValue,
                          { fontSize: isTablet ? 14 : 16 },
                        ]}
                      >
                        {minLifespan}
                      </Text>
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.statMinMaxLabel,
                          { fontSize: isTablet ? 9 : 11 },
                        ]}
                      >
                        Max
                      </Text>
                      <Text
                        testID="stat-max"
                        style={[
                          styles.statMaxValue,
                          { fontSize: isTablet ? 14 : 16 },
                        ]}
                      >
                        {maxLifespan}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        <Text style={styles.xAxisTitle}>Life Span (hours)</Text>

        {/* Chart Controls */}
        {chartControls.renderControls()}

        {/* Save Scenario Button */}
        <View style={styles.databaseButtonContainer}>
          <View style={styles.buttonWrapper}>
            <Button
              title="Save Current Scenario"
              onPress={() => setShowScenariosModal(true)}
              color="#0066cc"
            />
          </View>
        </View>

        {/* Modals */}
        {dataGenerationModal.renderModal()}
        {barGenerationModal.renderModal()}

        <UploadScenarioModal
          visible={isUploadModalVisible}
          onClose={() => setIsUploadModalVisible(false)}
          toolType="minitool1"
          onSuccess={handleUploadSuccess}
          onError={(err) => console.error("Upload Error:", err)}
        />

        <BarInfoModal
          visible={isBarInfoModalVisible}
          barData={selectedBar}
          onClose={handleCloseBarInfoModal}
          onDelete={handleDeleteBar}
        />

        {/* Scenarios Management Modal */}
        <Modal
          visible={showScenariosModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowScenariosModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Manage Scenarios</Text>

              <View style={styles.saveScenarioSection}>
                <Text style={styles.sectionTitle}>Save Current Scenario</Text>
                <TextInput
                  style={styles.scenarioInput}
                  placeholder="Enter scenario name..."
                  value={scenarioName}
                  onChangeText={setScenarioName}
                  editable={!isSavingScenario}
                />
                <Button
                  title={isSavingScenario ? "Saving..." : "Save Scenario"}
                  onPress={saveScenario}
                  disabled={isSavingScenario}
                  color="#0066cc"
                />
              </View>

              <TouchableOpacity
                onPress={() => setShowScenariosModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#e5e7eb",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    alignItems: "center",
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 10,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
    flexWrap: "wrap",
    width: "95%",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 15,
  },
  legendColorBox: {
    width: 15,
    height: 15,
    marginRight: 8,
  },
  collapsibleContainer: {
    width: "95%",
    marginBottom: 15,
    backgroundColor: "#f7f7f7",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#d1d5db",
    overflow: "hidden",
  },
  collapsibleHeader: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e5e7eb",
  },
  collapsibleHeaderText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginLeft: 5,
  },
  collapsibleContent: {
    flex: 1,
    padding: 15,
    backgroundColor: "#f9f9f9",
  },
  helpSectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 10,
    color: "#111827",
  },
  helpText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#374151",
  },
  helpList: {
    marginTop: 5,
  },
  helpListItem: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 8,
    color: "#374151",
  },
  helpTextBold: {
    fontWeight: "bold",
    color: "#1f2937",
  },
  scenarioLoaderContainer: {
    width: "95%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 15,
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  scenarioPickerContainer: {
    flex: 1,
    minWidth: 200,
  },
  chartAndStatsContainer: {
    width: "95%",
    alignItems: "flex-start",
    flexDirection: "row",
  },
  chartContainer: {
    width: "100%",
    position: "relative",
    minHeight: 100,
    zIndex: 10,
  },
  xAxisTitle: {
    fontSize: 12,
    color: AXIS_COLOR,
    marginTop: 10,
  },
  toolLabelContainer: {
    left: -Y_AXIS_WIDTH / 2,
    top: 0,
    position: "absolute",
    height: TOOL_LABEL_OFFSET_Y,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 15,
  },
  toolLabelText: {
    color: TOOL_COLOR,
    fontWeight: "bold",
    fontSize: 14,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 2,
    borderRadius: 3,
  },
  rangeLabelContainer: {
    left: Y_AXIS_WIDTH / 2,
    top: -X_AXIS_HEIGHT / 2,
    position: "absolute",
    height: RANGE_LABEL_OFFSET_Y + TOP_BUFFER,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  rangeLabelText: {
    color: RANGE_TOOL_COLOR,
    fontWeight: "bold",
    fontSize: 14,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  // --- Stats Sidebar (Tablet/Desktop) ---
  statsSidebar: {
    backgroundColor: "#f0f0f0",
    justifyContent: "space-between",
    borderRadius: 12,
    marginLeft: 10,
  },
  statsSidebarCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  statsSidebarBottom: {
    borderTopWidth: 1,
    borderTopColor: "#ccc",
    paddingTop: 10,
  },
  statLabel: {
    fontWeight: "bold",
    marginBottom: 6,
    color: "#333",
  },
  statAmountValue: {
    fontWeight: "bold",
    color: "#2563eb",
  },
  statMinMaxLabel: {
    fontWeight: "bold",
    marginBottom: 3,
    color: "#666",
  },
  statMinValue: {
    fontWeight: "600",
    color: "#1e40af",
  },
  statMaxValue: {
    fontWeight: "600",
    color: "#dc2626",
  },
  // --- Stats Mobile ---
  statsBarMobile: {
    width: "95%",
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 12,
    justifyContent: "space-around",
  },
  statItemMobile: {
    alignItems: "center",
    flex: 1,
  },
  statItemBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#ccc",
  },
  statLabelMobile: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 4,
  },
  statValueMobile: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563eb",
  },
  // --- Buttons ---
  topButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginLeft: 15,
    flex: 1,
    flexWrap: "wrap",
    marginTop: 6,
    marginBottom: 6,
  },
  topButtonsContainerMobile: {
    gap: 4,
    flex: 1,
    flexWrap: "wrap",
    width: "95%",
    alignSelf: "center",
    marginLeft: 0,
  },
  topButton: {
    minWidth: 140,
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 30,
  },
  topButtonMobile: {
    minWidth: 100,
    flex: 1,
    minHeight: 30,
    paddingHorizontal: 15,
  },
  topButtonTablet: {
    minWidth: 100,
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  databaseButtonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "90%",
    marginTop: 15,
    flexWrap: "wrap",
    gap: 10,
  },
  buttonWrapper: {
    flex: 1,
    minWidth: 100,
  },
  // --- Responsive ---
  scenarioLoaderMobile: {
    flexDirection: "column",
    gap: 15,
  },
  scenarioPickerMobile: {
    width: "95%",
    alignSelf: "center",
    marginBottom: 0,
  },
  scenarioLoaderTablet: {
    flexDirection: "column",
    gap: 12,
    paddingHorizontal: 10,
  },
  scenarioPickerTablet: {
    width: "100%",
    alignSelf: "center",
    marginBottom: 0,
  },
  topButtonsContainerTablet: {
    width: "100%",
    alignSelf: "center",
    marginLeft: 0,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 10,
  },
  chartAndStatsMobile: {
    flexDirection: "column",
    marginTop: 20,
    width: "95%",
  },
  // --- Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  saveScenarioSection: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  scenarioInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: "#666",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
});

export default Minitool_1;
