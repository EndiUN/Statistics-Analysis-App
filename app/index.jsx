import "../global.css";
import { Text, View, ScrollView, Image, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { logo } from "../constants/icons";
import { Redirect, router } from "expo-router";
import CustomButton from "../components/customButton";

const menuButtonStyles = "bg-sky-400/75 w-full hover:opacity-95";

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.logoContainer}>
          <Image
            source={logo}
            style={styles.imageContainer}
            resizeMode="contain"
          />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.titleText}>
            Explore our <Text style={styles.highlightText}>Minitools</Text> and
            learn in a <Text style={styles.highlightText}>Fun</Text> way!
          </Text>
        </View>

        <View style={styles.buttonGroup}>
          <CustomButton
            title="Minitool 1"
            hadlePress={() => router.push("/minitool_1")}
            containerStyles={menuButtonStyles}
          />
          <CustomButton
            title="Minitool 2"
            hadlePress={() => router.push("/minitool_2")}
            containerStyles={menuButtonStyles}
          />
          <CustomButton
            title="Minitool 3"
            hadlePress={() => router.push("minitool_3")}
            containerStyles={menuButtonStyles}
          />
        </View>
      </ScrollView>
      <StatusBar backgroundColor="#F8FBFC" style="black" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f0f0f0",
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
    minHeight: "100%",
  },
  logoContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  imageContainer: {
    height: 180,
    width: "80%",
    maxWidth: 320,
    alignSelf: "center",
  },
  titleContainer: {
    marginTop: 10,
    marginBottom: 24,
    width: "100%",
    alignItems: "center",
  },
  titleText: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#222",
    textAlign: "center",
  },
  highlightText: {
    color: "#38bdf8",
    opacity: 0.75,
    fontWeight: "bold",
  },
  buttonGroup: {
    width: "100%",
    maxWidth: 500, // Constrain the max width of the button container
    gap: 16,
    marginTop: 10,
    marginBottom: 10,
    alignItems: "center",
  },
});
