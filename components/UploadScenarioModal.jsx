import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";

const API_URL = "http://localhost:5000/api/datasets/upload";

/**
 * UploadScenarioModal
 *
 * Reusable modal form for uploading a CSV/Excel file as a scenario.
 * The parent controls visibility via `visible` and provides the `toolType`.
 * The user fills in name, description, and picks a file inside the modal.
 *
 * Props:
 *   visible   – (bool)    whether the modal is shown
 *   onClose   – (fn)      called when the modal should close
 *   toolType  – (string)  one of: minitool1, minitool2, minitool3
 *   onSuccess – (fn)      called with the created scenario object after successful upload
 *   onError   – (fn)      optional, called with error message string
 */
export default function UploadScenarioModal({
  visible,
  onClose,
  toolType,
  onSuccess,
  onError,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isError, setIsError] = useState(false);

  const resetForm = () => {
    setName("");
    setDescription("");
    setSelectedFile(null);
    setStatusMessage(null);
    setIsError(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "text/csv",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setSelectedFile(result.assets[0]);
      setStatusMessage(null);
      setIsError(false);
    } catch (err) {
      console.error("File picker error:", err);
      showMessage("Could not open file picker.", true);
    }
  };

  const uploadFile = async () => {
    if (!name.trim()) {
      showMessage("Please enter a scenario name.", true);
      return;
    }
    if (!selectedFile) {
      showMessage("Please select a file.", true);
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const formData = new FormData();

      if (Platform.OS === "web" && selectedFile.file) {
        formData.append("file", selectedFile.file, selectedFile.name);
      } else {
        formData.append("file", {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || "application/octet-stream",
        });
      }

      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("toolType", toolType);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showMessage(result.message || "Upload successful!", false);
        onSuccess?.(result.data);
        // Brief delay so the user sees the success message before closing
        setTimeout(() => {
          resetForm();
          onClose();
        }, 1200);
      } else {
        const errMsg = result.error || "Upload failed.";
        showMessage(errMsg, true);
        onError?.(errMsg);
      }
    } catch (error) {
      const errMsg = "Network error: " + error.message;
      showMessage(errMsg, true);
      onError?.(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const showMessage = (msg, error) => {
    setStatusMessage(msg);
    setIsError(error);
    if (Platform.OS !== "web") {
      Alert.alert(error ? "Error" : "Success", msg);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Upload Scenario from File</Text>

          {/* Name */}
          <Text style={styles.label}>Scenario Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter scenario name"
            value={name}
            onChangeText={setName}
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Optional description"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {/* File picker */}
          <TouchableOpacity style={styles.pickButton} onPress={pickFile}>
            <Text style={styles.pickButtonText}>
              {selectedFile ? "Change File" : "Select CSV / Excel File"}
            </Text>
          </TouchableOpacity>

          {selectedFile && (
            <Text style={styles.fileName}>{selectedFile.name}</Text>
          )}

          {/* Status */}
          {statusMessage && (
            <Text
              style={[
                styles.status,
                isError ? styles.errorText : styles.successText,
              ]}
            >
              {statusMessage}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.uploadButton,
                (isUploading || !selectedFile || !name.trim()) &&
                  styles.disabledButton,
              ]}
              onPress={uploadFile}
              disabled={isUploading || !selectedFile || !name.trim()}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.uploadButtonText}>Upload</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "90%",
    maxWidth: 450,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#1f2937",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 14,
    backgroundColor: "#f9fafb",
  },
  multilineInput: {
    height: 64,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  pickButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 6,
  },
  pickButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  fileName: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    marginBottom: 10,
  },
  status: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
  },
  errorText: { color: "#ef4444" },
  successText: { color: "#10b981" },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  uploadButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.5,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#6b7280",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});
