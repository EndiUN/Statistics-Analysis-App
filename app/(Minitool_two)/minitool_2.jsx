import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import UploadScenarioModal from '../../components/UploadScenarioModal';
import { calculateCombinedExtent } from '../../data/_data';
import useDimensions from '../hooks/useDimensions';

import DotPlot from './components/DotPlot';
import LegendPanel from './components/LegendPanel';
import GenerateDataModal from './components/GenerateDataModal';
import { pickerSelectStyles } from './components/styles';
import { CHART_DEFAULTS, DEFAULT_PRESETS } from './config/scenarios';
import { useDotPlotTools } from './hooks/useDotPlotTools';

const SMALL_SCREEN_THRESHOLD = 900;
const TOOL_TYPE = 'minitool2';
const API_URL = "https://statistics-api-4g2s.onrender.com/api/scenarios";
// Maximum observations kept per sample (Before / After) across every data
// entry path — generated, file-uploaded, or database-loaded.
const MAX_POINTS_PER_SAMPLE = 300;
// Best-effort detection: axios marks network/CORS/server-down failures with
// the ERR_NETWORK code. We surface a friendlier message in that case.
const isConnectionError = (err) =>
  err?.code === 'ERR_NETWORK' || err?.message === 'Network Error';

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
  // Enforce the per-sample cap regardless of where the data came from.
  data.before = data.before.slice(0, MAX_POINTS_PER_SAMPLE);
  data.after  = data.after.slice(0, MAX_POINTS_PER_SAMPLE);
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
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // The DotPlot tools (lines, group mode, etc.) are lifted here so the
  // page-level button bar can drive Clear-All-Lines alongside Save/Load,
  // Upload and Generate, keeping all primary actions in one place.
  const tools = useDotPlotTools({
    initialIntervalWidth: CHART_DEFAULTS.initialIntervalWidth,
  });

  // --- Database functions ------------------------------------------------ //
  const fetchScenarios = useCallback(async () => {
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
      setScenarios((prev) => ({
        ...DEFAULT_PRESETS,
        // Preserve any locally-generated scenarios that aren't DB-backed.
        ...Object.fromEntries(
          Object.entries(prev).filter(([k]) => k.startsWith('generated_')),
        ),
        ...dbEntries,
      }));
    } catch (error) {
      console.error("Error fetching scenarios:", error);
    } finally {
      setIsLoadingScenarios(false);
    }
  }, []);

  const saveScenario = async () => {
    if (!scenarioName.trim()) {
      alert('Please enter a scenario name.');
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
        alert('Failed to save scenario: ' + (response.data.error ?? 'Unknown error'));
      }
    } catch (error) {
      console.warn('Error saving scenario:', error);
      if (isConnectionError(error)) {
        alert('Connection Error. Unable to connect to database. Make sure the backend server is running on port 5000.');
      } else {
        alert('Error saving scenario: ' + error.message);
      }
    } finally {
      setIsSavingScenario(false);
    }
  };

  const deleteScenario = async (scenarioId) => {
    try {
      const response = await axios.delete(`${API_URL}/${scenarioId}`);
      if (!response.data.success) {
        alert('Failed to delete scenario: ' + (response.data.error ?? 'Unknown error'));
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
      console.warn('Error deleting scenario:', error);
      if (isConnectionError(error)) {
        alert('Connection Error. Unable to connect to database. Make sure the backend server is running on port 5000.');
      } else {
        alert('Error deleting scenario: ' + error.message);
      }
    }
  };

  const handleGenerateDataset = useCallback(
    ({ name, data }) => {
      const settings = buildSettingsFromScenario(name, data.before, data.after);
      const id = `generated_${Date.now()}`;
      setScenarios((prev) => ({
        ...prev,
        [id]: { label: `\u2728 ${name}`, data, settings },
      }));
      setSelectedScenario(id);
      tools.actions.clearAll();
    },
    [tools.actions],
  );

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  // --- Render ------------------------------------------------------------- //
  const { width: screenWidth } = useDimensions();
  const active = scenarios[selectedScenario];
  // Mobile uses essentially the full width; large screens cap the chart so
  // the page composition still feels balanced.
  const chartWidth =
    screenWidth < SMALL_SCREEN_THRESHOLD
      ? screenWidth - 16
      : Math.min(screenWidth * 0.6, 900);

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
                useNativeAndroidPickerStyle={false}
              />
            </View>

            <View style={styles.chartContainer}>
              {active && chartSettings && (
                <DotPlot
                  data={active.data}
                  settings={chartSettings}
                  tools={tools}
                />
              )}
            </View>

            {/* Primary action bar — Clear All Lines and Upload are the most
                emphasised actions per user feedback; Save/Load and Generate
                are secondary. All four share the same height / typography. */}
            <View style={styles.actionGrid}>
              <ActionButton
                label="Clear All Lines"
                variant="primary"
                disabled={!tools.hasAnyLines}
                onPress={tools.actions.clearAll}
              />
              <ActionButton
                label="Upload from File"
                variant="primary"
                onPress={() => setShowUploadModal(true)}
              />
              <ActionButton
                label="Save / Load"
                variant="secondary"
                onPress={() => {
                  fetchScenarios();
                  setShowScenariosModal(true);
                }}
              />
              <ActionButton
                label="Generate Dataset"
                variant="secondary"
                onPress={() => setShowGenerateModal(true)}
              />
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

        <GenerateDataModal
          visible={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleGenerateDataset}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

/**
 * Shared button used by the primary action bar. Two variants keep the
 * hierarchy clear (primary = filled accent, secondary = subdued).
 */
const ActionButton = ({ label, variant, disabled, onPress }) => {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      style={[
        styles.actionButton,
        isPrimary ? styles.actionButtonPrimary : styles.actionButtonSecondary,
        disabled && styles.actionButtonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text
        style={[
          styles.actionButtonText,
          isPrimary
            ? styles.actionButtonTextPrimary
            : styles.actionButtonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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
  pickerContainer: { width: '90%', marginBottom: 20, zIndex: 10 },
  pickerLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  chartContainer: { flex: 1, width: '100%', alignItems: 'center' },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '94%',
    marginTop: 16,
    gap: 10,
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPrimary: { backgroundColor: '#2563eb' },
  actionButtonSecondary: { backgroundColor: '#e5e7eb' },
  actionButtonDisabled: { opacity: 0.45 },
  actionButtonText: { fontSize: 14, fontWeight: '700' },
  actionButtonTextPrimary: { color: '#ffffff' },
  actionButtonTextSecondary: { color: '#1f2937' },
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

export default Minitool2Page;
