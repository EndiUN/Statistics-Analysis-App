import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

/**
 * Custom in-app alert. Replaces RN's native `alert()` / `Alert.alert()` so we
 * can present errors (e.g. database connection failures) in a way that fits
 * the visual style of the app and behaves consistently across web/native.
 *
 * Variants determine the accent colour only — content is fully user-supplied.
 *
 * Props:
 *   visible:    boolean
 *   title:      string
 *   message:    string
 *   variant?:   'error' | 'success' | 'info'   (default 'info')
 *   onClose:    () => void
 *   confirmLabel?: string                       (default 'Got it')
 */
const VARIANT_COLOR = {
  error: '#dc2626',
  success: '#16a34a',
  info: '#2563eb',
};

const AlertModal = ({
  visible,
  title,
  message,
  variant = 'info',
  onClose,
  confirmLabel = 'Got it',
}) => {
  const accent = VARIANT_COLOR[variant] ?? VARIANT_COLOR.info;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, { borderTopColor: accent }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: accent }]}>{title}</Text>
          <View style={styles.divider} />
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: accent }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'white',
    borderRadius: 14,
    borderTopWidth: 4,
    padding: 22,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 14 },
  message: { fontSize: 14, color: '#374151', lineHeight: 21, marginBottom: 18 },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 14 },
});

export default AlertModal;
