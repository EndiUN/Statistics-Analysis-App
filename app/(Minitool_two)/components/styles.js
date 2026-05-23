import { StyleSheet } from 'react-native';

export const dotPlotStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingVertical: 16, width: '100%' },
  chartsContainer: {
    flexDirection: 'column',
    width: '100%',
    alignItems: 'center',
  },
  panel: { alignItems: 'center', width: '100%', marginBottom: 15 },
  panelTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 5 },

  controlsBox: {
    width: '94%',
    marginTop: 18,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  controlsHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    width: '100%',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
    width: '100%',
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#f1f5f9',
  },
  controlLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    flex: 0,
    minWidth: 110,
  },
  // Wrapper that lets the picker / input grow to fill the remaining
  // horizontal space in a control row, so the picker never collapses to
  // just an arrow on narrow screens.
  controlField: { flex: 1 },
  numericInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#f9fafb',
    width: '100%',
  },
});

export const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    color: '#111827',
    paddingRight: 30,
    backgroundColor: '#f9fafb',
    width: '100%',
  },
  inputAndroid: {
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    color: '#111827',
    paddingRight: 30,
    backgroundColor: '#f9fafb',
    width: '100%',
  },
  inputWeb: {
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    color: '#111827',
    backgroundColor: '#f9fafb',
    width: '100%',
  },
});

export default () => null;
