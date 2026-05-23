import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  Text,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import axios from "axios";
import ScatterPlot from "./chart_components/ScatterPlot";
import ScatterControls from "./controls/ScatterControls";
import bivariateData from "../../data/bivariate_set.json";
import Dropdown from "../../components/dropDown";
import UniverseButton from "../../components/universeButton";
import UploadScenarioModal from "../../components/UploadScenarioModal";
import useDimensions from "../hooks/useDimensions";
import icon from "../../assets/onlyIcon.png";

const API_URL = "https://statistics-api-4g2s.onrender.com/api/scenarios";
const TOOL_TYPE = "minitool3";

// Local presets shipped with the app, available alongside DB scenarios.
const LOCAL_PRESETS = Object.keys(bivariateData).map((key) => ({
  id: `local:${key}`,
  name: key,
  data: bivariateData[key],
}));

// Normalise scenario payloads coming from either the manual save endpoint
// (data.currentData = [{x,y}]) or the file upload endpoint
// (data.dataPoints = [{x,y,...}]).
const extractPoints = (scenario) => {
  const data = scenario?.data;
  if (!data) return [];
  if (Array.isArray(data.currentData)) return data.currentData;
  if (Array.isArray(data.dataPoints)) {
    return data.dataPoints
      .map((row) => ({ x: Number(row.x), y: Number(row.y) }))
      .filter((p) => !Number.isNaN(p.x) && !Number.isNaN(p.y));
  }
  return [];
};

const showAlert = (title, message) => {
  if (Platform.OS === "web") {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

const Minitool_3 = () => {
  const [showCross, setShowCross] = useState(false);
  const [hideData, setHideData] = useState(false);
  const [activeGrid, setActiveGrid] = useState(null);
  const [twoGroupsCount, setTwoGroupsCount] = useState(null);
  const [fourGroupsCount, setFourGroupsCount] = useState(null);
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Toggle index in/out of the multi-selection list.
  const togglePointSelection = useCallback((index) => {
    setSelectedPoints((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  }, []);

  const handleActiveGridChange = (val) => {
    setActiveGrid(val);
    setTwoGroupsCount(null);
    setFourGroupsCount(null);
  };

  const handleTwoGroupsChange = (val) => {
    setTwoGroupsCount(val);
    setActiveGrid(null);
    setFourGroupsCount(null);
  };

  const handleFourGroupsChange = (val) => {
    setFourGroupsCount(val);
    setActiveGrid(null);
    setTwoGroupsCount(null);
  };

  const [currentKey, setCurrentKey] = useState("local:dataset1");
  const [currentData, setCurrentData] = useState(bivariateData.dataset1);
  const [scenarios, setScenarios] = useState([]);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);

  const fetchScenarios = useCallback(async () => {
    try {
      setIsLoadingScenarios(true);
      const response = await axios.get(`${API_URL}/tool/${TOOL_TYPE}`);
      if (response.data?.success) {
        setScenarios(response.data.data || []);
      }
    } catch (error) {
      console.error("Error fetching scenarios:", error);
      if (error.code === "ERR_NETWORK") {
        showAlert(
          "Connection Error",
          "Unable to reach the database. Make sure the backend server is running on port 5000.",
        );
      } else {
        showAlert("Error", "Failed to fetch scenarios from database.");
      }
    } finally {
      setIsLoadingScenarios(false);
    }
  }, []);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  const dropdownOptions = [
    ...LOCAL_PRESETS.map((p) => ({ value: p.id, label: `★ ${p.name}` })),
    ...scenarios.map((s) => ({ value: s._id, label: s.name })),
  ];

  const handleSelectScenario = useCallback(async (value) => {
    if (!value) return;
    setCurrentKey(value);
    setSelectedPoints([]);

    if (value.startsWith("local:")) {
      const key = value.slice("local:".length);
      if (bivariateData[key]) setCurrentData(bivariateData[key]);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/${value}`);
      if (response.data?.success) {
        const points = extractPoints(response.data.data);
        if (points.length === 0) {
          showAlert("Empty Scenario", "This scenario has no x/y points.");
          return;
        }
        setCurrentData(points);
      } else {
        showAlert(
          "Error",
          "Failed to load scenario: " +
            (response.data?.error || "Unknown error"),
        );
      }
    } catch (error) {
      console.error("Error loading scenario:", error);
      showAlert("Error", "Failed to load scenario from database.");
    }
  }, []);

  const handleUploadSuccess = useCallback(
    (newScenario) => {
      setIsUploadModalVisible(false);
      fetchScenarios();
      if (newScenario?._id) {
        const points = extractPoints(newScenario);
        if (points.length > 0) {
          setCurrentData(points);
          setCurrentKey(newScenario._id);
        }
      }
    },
    [fetchScenarios],
  );

  const { width, height } = useDimensions();

  // --- Responsive breakpoints (memoized) ---
  const { isMobile, isTablet, isDesktop } = useMemo(() => {
    const mobile = width <= 580;
    const tablet = width > 580 && width < 1520;
    const desktop = width >= 1520;
    return { isMobile: mobile, isTablet: tablet, isDesktop: desktop };
  }, [width]);

  // Chart sizing - fits inside the screen with some breathing room
  const chartWidth = useMemo(() => {
    const horizontalPadding = isMobile ? 10 : 40;
    return Math.max(
      280,
      isMobile ? width - horizontalPadding : width * 0.55 - horizontalPadding,
    );
  }, [width, isMobile]);

  const chartHeight = useMemo(() => {
    return height * 0.75;
  }, [height]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        {/* <StatusBar backgroundColor="#2a7f9f" barStyle="light-content" /> */}
        <ScrollView
          style={styles.mainContainer}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          scrollEnabled={scrollEnabled}
        >
          {isDesktop && (
            <View style={styles.headerContainer}>
              <Image
                source={icon}
                style={styles.imageContainer}
                resizeMode="contain"
              />

              <View style={styles.helperWrapper}>
                <Text style={styles.title}>Scatter Plot Analysis</Text>

                {/* Dataset selector + Upload action row */}

                <View style={[styles.topRow, isMobile && styles.topRowMobile]}>
                  <View
                    style={[
                      styles.dropdownWrapper,

                      isMobile && styles.dropdownWrapperMobile,
                    ]}
                  >
                    <Dropdown
                      data={dropdownOptions}
                      onChange={handleSelectScenario}
                      placeholder={
                        isLoadingScenarios
                          ? "Loading scenarios..."
                          : "Select scenario"
                      }
                    />

                    {isLoadingScenarios && (
                      <ActivityIndicator
                        style={styles.loadingIndicator}
                        size="small"
                        color="#2a7f9f"
                      />
                    )}
                  </View>

                  <View style={[styles.uploadButtonWrapper]}>
                    <UniverseButton
                      title="Upload"
                      onPress={() => setIsUploadModalVisible(true)}
                      colorScheme="primary"
                      containerStyles={styles.uploadButton}
                    />
                  </View>
                </View>
              </View>

              <Image
                source={icon}
                style={styles.imageContainer}
                resizeMode="contain"
              />
            </View>
          )}

          {/* --- TABLET HEADER LAYOUT --- */}
          {isTablet && (
            <View style={styles.headerTabletContainer}>
              <Image
                source={icon}
                style={styles.subImageTablet}
                resizeMode="contain"
              />
              <View style={styles.tabletContentColumn}>
                <Text style={styles.titleTablet}>Scatter Plot Analysis</Text>
                <View style={styles.controlsRowTablet}>
                  <View style={styles.dropdownWrapperTablet}>
                    <Dropdown
                      data={dropdownOptions}
                      onChange={handleSelectScenario}
                      placeholder={
                        isLoadingScenarios
                          ? "Loading scenarios..."
                          : "Select scenario"
                      }
                    />
                    {isLoadingScenarios && (
                      <ActivityIndicator
                        style={styles.loadingIndicatorTablet}
                        size="small"
                        color="#2a7f9f"
                      />
                    )}
                  </View>
                  <View style={styles.uploadButtonWrapperTablet}>
                    <UniverseButton
                      title="Upload"
                      onPress={() => setIsUploadModalVisible(true)}
                      colorScheme="primary"
                      containerStyles={styles.uploadButtonTablet}
                    />
                  </View>
                </View>
              </View>
              <Image
                source={icon}
                style={styles.subImageTablet}
                resizeMode="contain"
              />
            </View>
          )}

          {/* --- MOBILE HEADER LAYOUT --- */}
          {isMobile && (
            <View style={styles.headerMobileContainer}>
              {/* First Section: 2 images stacked + label of the module */}
              <View style={styles.mobileTopSection}>
                <Image
                  source={icon}
                  style={styles.subImageMobile}
                  resizeMode="contain"
                />
                <Text style={styles.titleMobile}>Scatter Plot Analysis</Text>
                <Image
                  source={icon}
                  style={styles.subImageMobile}
                  resizeMode="contain"
                />
              </View>

              {/* Second Section: Button + Dropdown row */}
              <View style={styles.mobileBottomSection}>
                <View style={styles.dropdownWrapperMobile}>
                  <Dropdown
                    data={dropdownOptions}
                    onChange={handleSelectScenario}
                    placeholder={
                      isLoadingScenarios
                        ? "Loading scenarios..."
                        : "Select scenario"
                    }
                  />
                  {isLoadingScenarios && (
                    <ActivityIndicator
                      style={styles.loadingIndicatorMobile}
                      size="small"
                      color="#2a7f9f"
                    />
                  )}
                </View>
                <View style={styles.uploadButtonWrapperMobile}>
                  <UniverseButton
                    title="Upload"
                    onPress={() => setIsUploadModalVisible(true)}
                    colorScheme="primary"
                    containerStyles={styles.uploadButtonMobile}
                  />
                </View>
              </View>
            </View>
          )}

          {/* Main Chart Section */}
          <View
            style={[styles.chartSection, isMobile && styles.chartSectionMobile]}
          >
            <ScatterPlot
              data={currentData}
              width={chartWidth}
              height={chartHeight}
              showCross={showCross}
              hideData={hideData}
              activeGrid={activeGrid}
              twoGroupsCount={twoGroupsCount}
              fourGroupsCount={fourGroupsCount}
              selectedPoints={selectedPoints}
              onPointToggle={togglePointSelection}
              onScrollEnabled={setScrollEnabled}
              isMobile={isMobile}
            />
          </View>

          {/* Controls and Info Row */}

          <View style={{ flex: 1 }}>
            <ScatterControls
              isMobile={isMobile}
              showCross={showCross}
              onShowCrossChange={setShowCross}
              hideData={hideData}
              onHideDataChange={setHideData}
              activeGrid={activeGrid}
              onActiveGridChange={handleActiveGridChange}
              twoGroupsCount={twoGroupsCount}
              onTwoGroupsChange={handleTwoGroupsChange}
              fourGroupsCount={fourGroupsCount}
              onFourGroupsChange={handleFourGroupsChange}
            />
          </View>
        </ScrollView>
        <UploadScenarioModal
          visible={isUploadModalVisible}
          onClose={() => setIsUploadModalVisible(false)}
          toolType={TOOL_TYPE}
          onSuccess={handleUploadSuccess}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerContainer: {
    backgroundColor: "#e5e7eb",
    //paddingVertical: 15,
    paddingHorizontal: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    // flexGrow: 1,
    // paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    //alignItems: "center",
    //paddingBottom: 20,
  },
  imageContainer: {
    height: 150,
    width: "80%",
    maxWidth: 150,
    alignSelf: "center",
  },
  //-----------Title + DropDown + Button Wrapper---------------------
  helperWrapper: {
    flex: 1,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginHorizontal: 50,
    //marginVertical: 44,
  },
  title: {
    color: "#002e48",
    flexGrow: 1,
    textAlign: "center",
    fontSize: 32,
    fontWeight: "bold",
    //color: "#fff",
    marginHorizontal: 12,
    marginVertical: 14,
  },
  //-------------DropDown + Button -----------------
  topRow: {
    flexGrow: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    marginHorizontal: 12,
    marginTop: 14,
    //marginBottom: 12,
    gap: 12,
    zIndex: 100,
  },
  topRowMobile: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingHorizontal: 12,
    gap: 8,
  },
  dropdownWrapper: {
    minWidth: 400,
    position: "relative",
  },
  dropdownWrapperMobile: {
    width: "100%",
  },
  loadingIndicator: {
    position: "absolute",
    right: 50,
    top: 16,
  },
  uploadButtonWrapper: {
    // marginTop: 4,
    marginBottom: 10,
  },
  uploadButtonWrapperMobile: {
    width: "100%",
  },
  uploadButton: {
    minWidth: 200,
    minHeight: 52,
    paddingHorizontal: 24,
  },
  uploadButtonMobile: {
    width: "100%",
    minHeight: 44,
  },
  //------------------------------------------------

  mainContainer: {
    //paddingBottom: 210,
    flex: 1,
    backgroundColor: "#e5e7eb",
  },
  contentContainer: {
    paddingVertical: 16,
  },
  chartSection: {
    backgroundColor: "#fff",
    marginHorizontal: 40,
    marginVertical: 10,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginHorizontal: 10,
    marginVertical: 8,
  },
  infoBox: {
    backgroundColor: "#fff",
    marginHorizontal: 10,
    marginVertical: 10,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#2563eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#2563eb",
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "capitalize",
  },
  infoDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },

  chartSectionMobile: {
    marginHorizontal: 0,
  },
  controlsSectionMobile: {
    height: 700,
    flexDirection: "column",
    alignItems: "stretch",
    marginHorizontal: 6,
  },
  dropdownContainer: {
    alignSelf: "center",
    width: 300,
    zIndex: 100, // Crucial for iOS to stay above the SVG
    position: "relative", // Keeps the list anchored to the header
  },
  dropdownHeader: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
    height: 40, // Fixed height helps with alignment
    justifyContent: "center",
  },
  dropdownList: {
    position: "absolute", // Makes it float over the graph
    top: 42, // Position it just below the header (header height + margin)
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    maxHeight: 200, // Optional: add height limit if you have many items
    zIndex: 1000, // Ensure it's the top-most layer
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    overflow: "hidden", // Keeps items within the rounded borders
  },
  headerText: {
    fontWeight: "600",
    color: "#333",
  },
  item: {
    padding: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#eee",
  },
  itemText: {
    textAlign: "center",
    color: "#2563eb",
  },

  // --- Tablet Layout Styles ---
  headerTabletContainer: {
    backgroundColor: "#e5e7eb",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    zIndex: 100,
  },
  subImageTablet: {
    height: 100,
    width: 100,
  },
  tabletContentColumn: {
    flex: 1,
    flexDirection: "column",
    gap: 10,
  },
  titleTablet: {
    color: "#002e48",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  controlsRowTablet: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    gap: 10,
  },
  dropdownWrapperTablet: {
    flex: 1.5,
    alignSelf: "center",
    justifyContent: "space-around",
    position: "relative",
  },
  uploadButtonWrapperTablet: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  uploadButtonTablet: {
    minHeight: 52,
    minWidth: 150,
    maxWidth: 200,
  },
  loadingIndicatorTablet: {
    position: "absolute",
    right: 45,
    top: 16,
  },

  // --- Mobile Layout Styles ---
  headerMobileContainer: {
    backgroundColor: "#e5e7eb",
    padding: 14,
    flexDirection: "column",
    gap: 10,
    zIndex: 100,
  },
  mobileTopSection: {
    justifyContent: "space-evenly",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mobileImageRow: {
    flexDirection: "column", // Stacks images vertically
    alignItems: "center",
    gap: 6,
  },
  subImageMobile: {
    height: 50,
    width: 50,
  },
  titleMobile: {
    color: "#002e48",
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
  },
  mobileBottomSection: {
    flexDirection: "row", // Dropdown and Button side-by-side
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  dropdownWrapperMobile: {
    flex: 1.5,
    position: "relative",
  },
  uploadButtonWrapperMobile: {
    flex: 1,
    marginBottom: 10,
  },
  uploadButtonMobile: {
    minHeight: 52,
    width: "100%",
  },
  loadingIndicatorMobile: {
    position: "absolute",
    right: 40,
    top: 16,
  },
});

export default Minitool_3;
