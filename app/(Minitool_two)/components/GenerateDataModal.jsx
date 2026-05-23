import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { generateCholesterolData } from '../../../data/_data';

/**
 * Modal that lets the user spin up a synthetic two-sample dataset
 * (before/after) with the chosen size and value range. The generated dataset
 * is handed back to the parent via `onGenerate`, which is responsible for
 * registering it as an active scenario.
 *
 * Counts are clamped to [1, 300] per project performance budget.
 *
 * Props:
 *   visible:    boolean
 *   onClose:    () => void
 *   onGenerate: ({ name, data }) => void
 */
const MAX_POINTS = 300;
const DEFAULTS = Object.freeze({
  name: 'Generated dataset',
  beforeCount: '120',
  beforeMin: '40',
  beforeMax: '80',
  afterCount: '120',
  afterMin: '40',
  afterMax: '80',
});

const parsePositiveNumber = (text, fallback) => {
  const n = parseFloat(text);
  return Number.isFinite(n) ? n : fallback;
};

const GenerateDataModal = ({ visible, onClose, onGenerate }) => {
  const [name, setName] = useState(DEFAULTS.name);
  const [beforeCount, setBeforeCount] = useState(DEFAULTS.beforeCount);
  const [beforeMin, setBeforeMin] = useState(DEFAULTS.beforeMin);
  const [beforeMax, setBeforeMax] = useState(DEFAULTS.beforeMax);
  const [afterCount, setAfterCount] = useState(DEFAULTS.afterCount);
  const [afterMin, setAfterMin] = useState(DEFAULTS.afterMin);
  const [afterMax, setAfterMax] = useState(DEFAULTS.afterMax);
  const [error, setError] = useState(null);

  const handleGenerate = () => {
    const bCount = Math.min(
      MAX_POINTS,
      Math.max(1, Math.round(parsePositiveNumber(beforeCount, 0))),
    );
    const aCount = Math.min(
      MAX_POINTS,
      Math.max(1, Math.round(parsePositiveNumber(afterCount, 0))),
    );
    const bMin = parsePositiveNumber(beforeMin, NaN);
    const bMax = parsePositiveNumber(beforeMax, NaN);
    const aMin = parsePositiveNumber(afterMin, NaN);
    const aMax = parsePositiveNumber(afterMax, NaN);

    if (!Number.isFinite(bMin) || !Number.isFinite(bMax) || bMin >= bMax) {
      setError('Before: min must be a number strictly less than max.');
      return;
    }
    if (!Number.isFinite(aMin) || !Number.isFinite(aMax) || aMin >= aMax) {
      setError('After: min must be a number strictly less than max.');
      return;
    }
    if (!name.trim()) {
      setError('Please provide a name for the generated dataset.');
      return;
    }

    setError(null);
    onGenerate({
      name: name.trim(),
      data: {
        before: generateCholesterolData(bCount, bMin, bMax),
        after: generateCholesterolData(aCount, aMin, aMax),
      },
    });
    onClose();
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>Generate Dataset</Text>
          <Text style={styles.subtitle}>
            Create a random two-sample dataset. Each sample is uniformly
            distributed within its range.
          </Text>

          <Text style={styles.fieldLabel}>Dataset name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Trial run 1"
          />

          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: 'blue' }]} />
            <Text style={styles.sectionTitle}>Before</Text>
          </View>
          <NumericRow
            countLabel="Points"
            count={beforeCount}
            onCountChange={setBeforeCount}
            min={beforeMin}
            onMinChange={setBeforeMin}
            max={beforeMax}
            onMaxChange={setBeforeMax}
          />

          <View style={styles.sectionHeader}>
            <View style={[styles.dot, { backgroundColor: 'orange' }]} />
            <Text style={styles.sectionTitle}>After</Text>
          </View>
          <NumericRow
            countLabel="Points"
            count={afterCount}
            onCountChange={setAfterCount}
            min={afterMin}
            onMinChange={setAfterMin}
            max={afterMax}
            onMaxChange={setAfterMax}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={onClose}
            >
              <Text style={styles.btnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={handleGenerate}
            >
              <Text style={styles.btnPrimaryText}>Generate</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const NumericRow = ({
  countLabel,
  count,
  onCountChange,
  min,
  onMinChange,
  max,
  onMaxChange,
}) => (
  <View style={styles.numericRow}>
    <Field label={countLabel} value={count} onChange={onCountChange} keyboard="numeric" />
    <Field label="Min" value={min} onChange={onMinChange} keyboard="decimal-pad" />
    <Field label="Max" value={max} onChange={onMaxChange} keyboard="decimal-pad" />
  </View>
);

const Field = ({ label, value, onChange, keyboard }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabelSmall}>{label}</Text>
    <TextInput
      style={styles.numericInput}
      value={value}
      onChangeText={onChange}
      keyboardType={keyboard}
    />
  </View>
);

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: 'white',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
    maxHeight: '92%',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
    backgroundColor: '#fafafa',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  numericRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  field: { flex: 1 },
  fieldLabelSmall: { fontSize: 11, color: '#6b7280', marginBottom: 4 },
  numericInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  error: { color: '#dc2626', fontSize: 13, marginTop: 4, marginBottom: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  btn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnPrimaryText: { color: 'white', fontWeight: '700' },
  btnSecondary: { backgroundColor: '#e5e7eb' },
  btnSecondaryText: { color: '#374151', fontWeight: '700' },
});

export default GenerateDataModal;
