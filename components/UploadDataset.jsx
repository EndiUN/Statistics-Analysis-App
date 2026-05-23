import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import Constants from "expo-constants";

// Resolve the API base URL from Expo config (app.json -> expo.extra.apiUrl)
// with an env-var override for CI / production builds.
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  Constants.expoConfig?.extra?.apiUrl ??
  "http://localhost:5000";
const API_URL = `${API_BASE}/api/datasets/upload`;

/**
 * UploadDataset
 *
 * A reusable component that lets a teacher-designer pick a CSV or Excel file
 * from their device, attach metadata (name, description, toolType),
 * and upload it to the backend for parsing + storage as a Scenario.
 *
 * Props:
 *   name        – (string)  scenario name
 *   description – (string)  optional description
 *   toolType    – (string)  one of: minitool1, minitool2, minitool3
 *   onSuccess   – (fn)  callback receiving the created scenario object
 *   onError     – (fn)  callback receiving the error message string
 */
export default function UploadDataset({
  name = "",
  description = "",
  toolType = "minitool1",
  onSuccess,
  onError,
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [isError, setIsError] = useState(false);

  /**
   * Open the device file picker filtered to CSV / Excel types.
   */
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

      // User cancelled
      if (result.canceled) return;

      const file = result.assets[0];
      setSelectedFile(file);
      setStatusMessage(null);
      setIsError(false);
    } catch (err) {
      console.error("File picker error:", err);
      showMessage("Could not open file picker.", true);
    }
  };

  /**
   * Build a FormData payload and POST it to the backend upload endpoint.
   */
  const uploadFile = async () => {
    if (!selectedFile) {
      showMessage("Please select a file first.", true);
      return;
    }

    if (!name.trim()) {
      showMessage("Please provide a scenario name.", true);
      return;
    }

    setIsUploading(true);
    setStatusMessage(null);
    setIsError(false);

    try {
      const formData = new FormData();

      // On web, expo-document-picker provides a File object via selectedFile.file
      // On native, we pass the { uri, name, type } object that React Native expects
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
        // Do NOT set Content-Type manually — fetch will set the boundary
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showMessage(result.message || "Upload successful!", false);
        setSelectedFile(null);
        onSuccess?.(result.data);
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

  /** Update local status and optionally fire an Alert on mobile. */
  const showMessage = (msg, error) => {
    setStatusMessage(msg);
    setIsError(error);
    if (Platform.OS !== "web") {
      Alert.alert(error ? "Error" : "Success", msg);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Upload Dataset</Text>

      {/* File picker button */}
      <TouchableOpacity style={styles.pickButton} onPress={pickFile}>
        <Text style={styles.pickButtonText}>
          {selectedFile ? "Change File" : "Select CSV / Excel File"}
        </Text>
      </TouchableOpacity>

      {/* Selected file name */}
      {selectedFile && (
        <Text style={styles.fileName}>{selectedFile.name}</Text>
      )}

      {/* Upload button */}
      <TouchableOpacity
        style={[
          styles.uploadButton,
          (!selectedFile || isUploading) && styles.disabledButton,
        ]}
        onPress={uploadFile}
        disabled={!selectedFile || isUploading}
      >
        {isUploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.uploadButtonText}>Upload</Text>
        )}
      </TouchableOpacity>

      {/* Status feedback */}
      {statusMessage && (
        <Text style={[styles.status, isError ? styles.errorText : styles.successText]}>
          {statusMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    marginVertical: 12,
    alignItems: "center",
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    color: "#1f2937",
  },
  pickButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 8,
  },
  pickButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  fileName: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },
  uploadButton: {
    backgroundColor: "#10b981",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 4,
  },
  uploadButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  status: {
    marginTop: 16,
    fontSize: 14,
    textAlign: "center",
  },
  errorText: {
    color: "#ef4444",
  },
  successText: {
    color: "#10b981",
  },
});
