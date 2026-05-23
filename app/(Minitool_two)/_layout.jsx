import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

const Minitool_2_layout = () => {
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="minitool_2"
          options={{ title: "Minitool 2" }}
        />
      </Stack>

      <StatusBar backgroundColor="#e5e7eb" style="auto" />
    </>
  );
};

export default Minitool_2_layout;
