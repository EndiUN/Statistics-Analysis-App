import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import axios from "axios";
import RNPickerSelect from "react-native-picker-select";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import UploadScenarioModal from "../../components/UploadScenarioModal";
import { calculateCombinedExtent } from "../../data/_data";

import DotPlot from "./components/DotPlot";
import LegendPanel from "./components/LegendPanel";
import { CHART_DEFAULTS, DEFAULT_PRESETS } from "./config/scenarios";

const screenWidth = Dimensions.get("window").width;
const SMALL_SCREEN_THRESHOLD = 900;
const TOOL_TYPE = "minitool2";
const API_URL = "https://statistics-api-4g2s.onrender.com/api/scenarios";

/**
 * Builds a chart settings object from a saved scenario record.
 */
const buildSettingsFromScenario = (name, beforeValues, afterValues) => {
  const extent = calculateCombinedExtent([beforeValues, afterValues]);
  return {
    ...CHART_DEFAULTS,
    chartName: name,
    xDomain: { min: Math.floor(extent.min), max: Math.ceil(extent.max) },
    xAxisStep: 2,
    initialIntervalWidth: 10,
  };
};

/**
 * Maps a raw API scenario record to the internal `{label, data, settings}`
 * shape used by the chart. Returns null if the record format isn't usable.
 */
const adaptDbScenario = (s) => {
  let data;
  if (s.data.dataBefore && s.data.dataAfter) {
    data = { before: s.data.dataBefore, after: s.data.dataAfter };
  } else if (Array.isArray(s.data.dataPoints)) {
    const cols = s.data.columns || Object.keys(s.data.dataPoints[0] || {});
    const beforeCol = cols.find((c) => c.toLowerCase() === "before") || cols[0];
    const afterCol = cols.find((c) => c.toLowerCase() === "after") || cols[1];
    data = {
      before: s.data.dataPoints
        .map((r) => r[beforeCol])
        .filter((v) => typeof v === "number"),
      after: s.data.dataPoints
        .map((r) => r[afterCol])
        .filter((v) => typeof v === "number"),
    };
  } else {
    return null;
  }
  if (!data.before.length && !data.after.length) return null;
  return {
    label: s.name,
    data,
    settings: buildSettingsFromScenario(s.name, data.before, data.after),
    isFromDb: true,
    dbId: s._id,
  };
};

const Minitool2Page = () => {
  const [selectedScenario, setSelectedScenario] = useState("cholesterol");
  const [scenarios, setScenarios] = useState(DEFAULT_PRESETS);
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(false);
  const [showScenariosModal, setShowScenariosModal] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [isSavingScenario, setIsSavingScenario] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // --- Database functions (preserved behaviour) --------------------------- //
  const fetchScenarios = async () => {
    setIsLoadingScenarios(true);
    try {
      const response = await axios.get(API_URL);
      if (!response.data.success) {
        console.error("Failed to fetch scenarios:", response.data.error);
        return;
      }
      const dbEntries = {};
      response.data.data
        .filter((s) => s.toolType === TOOL_TYPE)
        .forEach((s) => {
          const adapted = adaptDbScenario(s);
          if (adapted) dbEntries[`db_${s._id}`] = adapted;
        });
      setScenarios({ ...DEFAULT_PRESETS, ...dbEntries });
    } catch (error) {
      console.error("Error fetching scenarios:", error);
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  const saveScenario = async () => {
    if (!scenarioName.trim()) {
      alert("Please enter a scenario name");
      return;
    }
    setIsSavingScenario(true);
    try {
      const current = scenarios[selectedScenario];
      const response = await axios.post(API_URL, {
        name: scenarioName,
        description: `${current.label} scenario`,
        toolType: TOOL_TYPE,
        data: {
          dataBefore: current.data.before,
          dataAfter: current.data.after,
          scenarioType: selectedScenario,
        },
      });
      if (response.data.success) {
        alert("Scenario saved successfully!");
        setScenarioName("");
        fetchScenarios();
      } else {
        alert("Failed to save scenario: " + response.data.error);
      }
    } catch (error) {
      console.error("Error saving scenario:", error);
      alert("Error saving scenario: " + error.message);
    } finally {
      setIsSavingScenario(false);
    }
  };

  const deleteScenario = async (scenarioId) => {
    try {
      const response = await axios.delete(`${API_URL}/${scenarioId}`);
      if (!response.data.success) {
        alert("Failed to delete scenario: " + response.data.error);
        return;
      }
      const key = `db_${scenarioId}`;
      if (selectedScenario === key) setSelectedScenario("cholesterol");
      setScenarios((prev) => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
      alert("Scenario deleted successfully!");
    } catch (error) {
      console.error("Error deleting scenario:", error);
      alert("Error deleting scenario: " + error.message);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  // --- Render ------------------------------------------------------------- //
  const active = scenarios[selectedScenario];
  const chartWidth =
    screenWidth < SMALL_SCREEN_THRESHOLD
      ? screenWidth * 0.9
      : screenWidth * 0.6;

  const chartSettings = useMemo(
    () =>
      active
        ? { ...active.settings, width: chartWidth, height: 180, dotRadius: 5 }
        : null,
    [active, chartWidth],
  );

  const dbScenarioEntries = useMemo(
    () =>
      Object.entries(scenarios)
        .filter(([, s]) => s.isFromDb)
        .map(([key, s]) => ({ key, ...s })),
    [scenarios],
  );

  const scenarioPickerItems = useMemo(
    () =>
      Object.keys(scenarios).map((key) => ({
        label: scenarios[key].label,
        value: key,
      })),
    [scenarios],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={styles.moduleContainer}>
            <Text style={styles.moduleTitle}>
              Minitool 2: Dot Plot Scenarios
            </Text>

            {active?.isFromDb && (
              <Text style={styles.loadedScenarioText}>
                Loaded: {active.label}
              </Text>
            )}

            <LegendPanel />

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Select Scenario:</Text>
              <RNPickerSelect
                onValueChange={(v) => v && setSelectedScenario(v)}
                items={scenarioPickerItems}
                style={pickerSelectStyles}
                value={selectedScenario}
                placeholder={{}}
              />
            </View>

            <View style={styles.chartContainer}>
              {active && chartSettings && (
                <DotPlot data={active.data} settings={chartSettings} />
              )}
            </View>

            <View style={styles.databaseButtonContainer}>
              <TouchableOpacity
                style={styles.databaseButton}
                onPress={() => {
                  fetchScenarios();
                  setShowScenariosModal(true);
                }}
              >
                <Text style={styles.databaseButtonText}>
                  Save/Load Scenario
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.databaseButton, { backgroundColor: "#10b981" }]}
                onPress={() => setShowUploadModal(true)}
              >
                <Text style={styles.databaseButtonText}>
                  Upload Scenario from File
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Scenarios Modal — preserved from original implementation */}
        <Modal
          visible={showScenariosModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowScenariosModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Manage Scenarios</Text>

              <View style={styles.saveScenarioSection}>
                <Text style={styles.sectionTitle}>Save Current Scenario</Text>
                <TextInput
                  style={styles.scenarioInput}
                  placeholder="Enter scenario name"
                  value={scenarioName}
                  onChangeText={setScenarioName}
                />
                <TouchableOpacity
                  style={[styles.databaseButton, { marginTop: 10 }]}
                  onPress={saveScenario}
                  disabled={isSavingScenario}
                >
                  {isSavingScenario ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.databaseButtonText}>Save Scenario</Text>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.loadScenarioSection}>
                <Text style={styles.sectionTitle}>Load Saved Scenarios</Text>
                {isLoadingScenarios ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0000ff" />
                  </View>
                ) : dbScenarioEntries.length === 0 ? (
                  <Text style={styles.noScenariosText}>
                    No scenarios saved yet
                  </Text>
                ) : (
                  <FlatList
                    data={dbScenarioEntries}
                    keyExtractor={(item) => item.dbId}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <View style={styles.scenarioItem}>
                        <View style={styles.scenarioInfo}>
                          <Text style={styles.scenarioItemName}>
                            {item.label}
                          </Text>
                        </View>
                        <View style={styles.scenarioActions}>
                          <TouchableOpacity
                            style={styles.loadButton}
                            onPress={() => {
                              setSelectedScenario(item.key);
                              setShowScenariosModal(false);
                            }}
                          >
                            <Text style={styles.buttonText}>Load</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => deleteScenario(item.dbId)}
                          >
                            <Text style={styles.buttonText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                    style={styles.scenariosList}
                  />
                )}
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowScenariosModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <UploadScenarioModal
          visible={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          toolType={TOOL_TYPE}
          onSuccess={() => fetchScenarios()}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f0f0f0" },
  scrollViewContent: {
    alignItems: "center",
    paddingVertical: 20,
    flexGrow: 1,
    justifyContent: "center",
  },
  moduleContainer: { width: "100%", alignItems: "center", marginBottom: 30 },
  moduleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "navy",
    marginBottom: 15,
    textAlign: "center",
  },
  loadedScenarioText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  pickerContainer: { width: "90%", marginBottom: 20, zIndex: 10 },
  pickerLabel: { fontSize: 16, fontWeight: "bold", marginBottom: 5 },
  chartContainer: { flex: 1, width: "100%", alignItems: "center" },
  databaseButtonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "90%",
    marginTop: 15,
    flexWrap: "wrap",
    gap: 10,
  },
  databaseButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  databaseButtonText: { color: "white", fontWeight: "bold", fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
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
  loadScenarioSection: { maxHeight: 300, marginBottom: 20 },
  scenariosList: { maxHeight: 250 },
  scenarioItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#f9f9f9",
    marginBottom: 8,
    borderRadius: 8,
  },
  scenarioInfo: { flex: 1 },
  scenarioItemName: { fontSize: 14, fontWeight: "bold", color: "#333" },
  scenarioActions: { flexDirection: "row", gap: 8 },
  loadButton: {
    backgroundColor: "#009900",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: "#cc0000",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: { color: "white", fontWeight: "bold", fontSize: 12 },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  noScenariosText: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    paddingVertical: 20,
  },
  closeButton: {
    backgroundColor: "#666",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  closeButtonText: { color: "white", fontWeight: "bold", fontSize: 14 },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 4,
    color: "black",
    paddingRight: 30,
    backgroundColor: "white",
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: "purple",
    borderRadius: 8,
    color: "black",
    paddingRight: 30,
    backgroundColor: "white",
  },
});

export default Minitool2Page;
