import React from "react";
import {
  render,
  fireEvent,
  screen,
  waitFor,
  act,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import axios from "axios";
import Minitool_3 from "../minitool_3";

// ─── Mocks ──────────────────────────────────────────────────────────────
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}));

jest.mock("../../hooks/useDimensions", () => ({
  __esModule: true,
  default: jest.fn(() => ({ width: 1024, height: 768 })),
}));

// Stub bivariate dataset to a small, predictable payload.
jest.mock("../../../data/bivariate_set.json", () => ({
  __esModule: true,
  default: {
    dataset1: [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ],
    dataset2: [
      { x: 5, y: 50 },
      { x: 6, y: 60 },
    ],
  },
}));

// Replace ScatterPlot with a controllable mock that exposes its props as text.
jest.mock("../chart_components/ScatterPlot", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return jest.fn((props) => (
    <View testID="scatter-plot">
      <Text testID="scatter-data-length">{`points:${props.data.length}`}</Text>
      <Text testID="scatter-show-cross">{`showCross:${String(props.showCross)}`}</Text>
      <Text testID="scatter-hide-data">{`hideData:${String(props.hideData)}`}</Text>
      <Text testID="scatter-active-grid">{`activeGrid:${String(props.activeGrid)}`}</Text>
      <Text testID="scatter-two-groups">{`two:${String(props.twoGroupsCount)}`}</Text>
      <Text testID="scatter-four-groups">{`four:${String(props.fourGroupsCount)}`}</Text>
      <Text testID="scatter-selected">{`selected:${JSON.stringify(props.selectedPoints)}`}</Text>
      <Text
        testID="scatter-select-point"
        onPress={() => props.onPointToggle?.(0)}
      >
        select point 0
      </Text>
    </View>
  ));
});

// Replace ScatterControls with a mock that exposes a button per callback so we
// can drive every state change without re-implementing the dropdown UI.
jest.mock("../controls/ScatterControls", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return jest.fn((props) => (
    <View testID="scatter-controls">
      <Text testID="controls-isMobile">{`isMobile:${String(props.isMobile)}`}</Text>
      <Text
        testID="toggle-cross"
        onPress={() => props.onShowCrossChange(!props.showCross)}
      >
        toggle cross
      </Text>
      <Text
        testID="toggle-hide"
        onPress={() => props.onHideDataChange(!props.hideData)}
      >
        toggle hide
      </Text>
      <Text testID="set-grid-4" onPress={() => props.onActiveGridChange(4)}>
        grid 4
      </Text>
      <Text testID="set-two-5" onPress={() => props.onTwoGroupsChange(5)}>
        two 5
      </Text>
      <Text testID="set-four-6" onPress={() => props.onFourGroupsChange(6)}>
        four 6
      </Text>
    </View>
  ));
});

// Dropdown mock — exposes options + a way to "select" a value via testID.
jest.mock("../../../components/dropDown", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return jest.fn((props) => (
    <View testID="dataset-dropdown">
      <Text testID="dropdown-placeholder">{props.placeholder}</Text>
      {props.data.map((item) => (
        <Text
          key={item.value}
          testID={`dropdown-option-${item.value}`}
          onPress={() => props.onChange(item.value)}
        >
          {item.label}
        </Text>
      ))}
    </View>
  ));
});

// UniverseButton mock for the Upload trigger.
jest.mock("../../../components/universeButton", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return jest.fn(({ title, onPress }) => (
    <Text testID={`universe-button-${title}`} onPress={onPress}>
      {title}
    </Text>
  ));
});

// UploadScenarioModal mock — surfaces a button to simulate a successful upload.
jest.mock("../../../components/UploadScenarioModal", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return jest.fn(({ visible, onClose, onSuccess, toolType }) => {
    if (!visible) return null;
    return (
      <View testID="upload-modal">
        <Text testID="upload-modal-tooltype">{toolType}</Text>
        <Text testID="upload-modal-close" onPress={onClose}>
          close upload
        </Text>
        <Text
          testID="upload-modal-success"
          onPress={() =>
            onSuccess?.({
              _id: "uploaded-id",
              name: "Uploaded Scenario",
              data: {
                dataPoints: [
                  { x: 100, y: 200 },
                  { x: 110, y: 220 },
                ],
              },
            })
          }
        >
          fire success
        </Text>
      </View>
    );
  });
});

// ─── Helpers ────────────────────────────────────────────────────────────
const renderMinitool3 = () => render(<Minitool_3 />);

describe("Minitool_3 Integration Tests", () => {
  let alertSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });
    // Platform defaults to ios in jest-expo, so Alert.alert is what fires.
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe("Initial render", () => {
    test("renders header, scatter plot, controls, and upload button", async () => {
      renderMinitool3();
      expect(screen.getByText("Scatter Plot Analysis")).toBeTruthy();
      expect(screen.getByTestId("scatter-plot")).toBeTruthy();
      expect(screen.getByTestId("scatter-controls")).toBeTruthy();
      expect(screen.getByTestId("universe-button-Upload")).toBeTruthy();
    });

    test("starts with the first local preset (dataset1) loaded", () => {
      renderMinitool3();
      // Stubbed dataset1 has 3 points
      expect(screen.getByTestId("scatter-data-length").children).toContain(
        "points:3",
      );
    });

    test("controls receive default state (no overlays active)", () => {
      renderMinitool3();
      expect(screen.getByTestId("scatter-show-cross").children).toContain(
        "showCross:false",
      );
      expect(screen.getByTestId("scatter-hide-data").children).toContain(
        "hideData:false",
      );
      expect(screen.getByTestId("scatter-active-grid").children).toContain(
        "activeGrid:null",
      );
      expect(screen.getByTestId("scatter-two-groups").children).toContain(
        "two:null",
      );
      expect(screen.getByTestId("scatter-four-groups").children).toContain(
        "four:null",
      );
    });
  });

  describe("Scenario fetching", () => {
    test("merges DB scenarios with local presets in the dropdown", async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [
            { _id: "db1", name: "DB Scenario A" },
            { _id: "db2", name: "DB Scenario B" },
          ],
        },
      });

      renderMinitool3();

      await waitFor(() => {
        // Local presets are prefixed with ★
        expect(screen.getByText("★ dataset1")).toBeTruthy();
        expect(screen.getByText("★ dataset2")).toBeTruthy();
        expect(screen.getByText("DB Scenario A")).toBeTruthy();
        expect(screen.getByText("DB Scenario B")).toBeTruthy();
      });
    });

    test("shows a connection error alert when the network is unreachable", async () => {
      axios.get.mockRejectedValueOnce({
        code: "ERR_NETWORK",
        message: "Network Error",
      });
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      renderMinitool3();

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          "Connection Error",
          expect.stringContaining("backend server"),
        );
      });
      consoleSpy.mockRestore();
    });

    test("shows a generic error alert on non-network failures", async () => {
      axios.get.mockRejectedValueOnce(new Error("boom"));
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      renderMinitool3();

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          "Error",
          "Failed to fetch scenarios from database.",
        );
      });
      consoleSpy.mockRestore();
    });
  });

  describe("Scenario selection", () => {
    test("switching to another local preset swaps the data passed to ScatterPlot", async () => {
      renderMinitool3();
      await waitFor(() =>
        expect(
          screen.getByTestId("dropdown-option-local:dataset2"),
        ).toBeTruthy(),
      );

      fireEvent.press(screen.getByTestId("dropdown-option-local:dataset2"));

      await waitFor(() => {
        expect(screen.getByTestId("scatter-data-length").children).toContain(
          "points:2",
        );
      });
    });

    test("loading a DB scenario fetches it and updates the chart", async () => {
      axios.get.mockImplementation((url) => {
        if (url.endsWith("/tool/minitool3")) {
          return Promise.resolve({
            data: {
              success: true,
              data: [{ _id: "db1", name: "Remote Scenario" }],
            },
          });
        }
        if (url.endsWith("/db1")) {
          return Promise.resolve({
            data: {
              success: true,
              data: {
                data: {
                  currentData: [
                    { x: 1, y: 2 },
                    { x: 3, y: 4 },
                    { x: 5, y: 6 },
                    { x: 7, y: 8 },
                  ],
                },
              },
            },
          });
        }
        return Promise.resolve({ data: { success: true, data: [] } });
      });

      renderMinitool3();
      await waitFor(() =>
        expect(screen.getByTestId("dropdown-option-db1")).toBeTruthy(),
      );

      fireEvent.press(screen.getByTestId("dropdown-option-db1"));

      await waitFor(() => {
        expect(screen.getByTestId("scatter-data-length").children).toContain(
          "points:4",
        );
      });
    });

    test("alerts when a DB scenario contains no usable points", async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ _id: "db3", name: "Empty Scenario" }],
        },
      });
      axios.get.mockResolvedValueOnce({
        data: { success: true, data: { data: { currentData: [] } } },
      });

      renderMinitool3();
      await waitFor(() =>
        expect(screen.getByTestId("dropdown-option-db3")).toBeTruthy(),
      );

      fireEvent.press(screen.getByTestId("dropdown-option-db3"));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          "Empty Scenario",
          expect.stringContaining("no x/y points"),
        );
      });
      // Original data remains unchanged
      expect(screen.getByTestId("scatter-data-length").children).toContain(
        "points:3",
      );
    });

    test("surfaces an error when loading a DB scenario fails", async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: [{ _id: "db4", name: "Broken Scenario" }],
        },
      });
      axios.get.mockRejectedValueOnce(new Error("backend down"));
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      renderMinitool3();
      await waitFor(() =>
        expect(screen.getByTestId("dropdown-option-db4")).toBeTruthy(),
      );

      fireEvent.press(screen.getByTestId("dropdown-option-db4"));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          "Error",
          "Failed to load scenario from database.",
        );
      });
      consoleSpy.mockRestore();
    });
  });

  describe("Controls drive ScatterPlot props", () => {
    test("toggling Show Cross flips the showCross prop", async () => {
      renderMinitool3();
      fireEvent.press(screen.getByTestId("toggle-cross"));
      await waitFor(() => {
        expect(screen.getByTestId("scatter-show-cross").children).toContain(
          "showCross:true",
        );
      });
    });

    test("toggling Hide Data flips the hideData prop", async () => {
      renderMinitool3();
      fireEvent.press(screen.getByTestId("toggle-hide"));
      await waitFor(() => {
        expect(screen.getByTestId("scatter-hide-data").children).toContain(
          "hideData:true",
        );
      });
    });

    test("activating a grid clears two/four groups (mutual exclusion)", async () => {
      renderMinitool3();

      // First select two-groups…
      fireEvent.press(screen.getByTestId("set-two-5"));
      await waitFor(() =>
        expect(screen.getByTestId("scatter-two-groups").children).toContain(
          "two:5",
        ),
      );

      // …then activate a grid; two-groups should reset to null
      fireEvent.press(screen.getByTestId("set-grid-4"));
      await waitFor(() => {
        expect(screen.getByTestId("scatter-active-grid").children).toContain(
          "activeGrid:4",
        );
        expect(screen.getByTestId("scatter-two-groups").children).toContain(
          "two:null",
        );
        expect(screen.getByTestId("scatter-four-groups").children).toContain(
          "four:null",
        );
      });
    });

    test("activating four-groups clears grid and two-groups", async () => {
      renderMinitool3();

      fireEvent.press(screen.getByTestId("set-grid-4"));
      await waitFor(() =>
        expect(screen.getByTestId("scatter-active-grid").children).toContain(
          "activeGrid:4",
        ),
      );

      fireEvent.press(screen.getByTestId("set-four-6"));
      await waitFor(() => {
        expect(screen.getByTestId("scatter-four-groups").children).toContain(
          "four:6",
        );
        expect(screen.getByTestId("scatter-active-grid").children).toContain(
          "activeGrid:null",
        );
        expect(screen.getByTestId("scatter-two-groups").children).toContain(
          "two:null",
        );
      });
    });
  });

  describe("Point selection", () => {
    test("selecting a point on the scatter plot updates selectedPoint prop", async () => {
      renderMinitool3();
      expect(screen.getByTestId("scatter-selected").children).toContain(
        "selected:[]",
      );
      fireEvent.press(screen.getByTestId("scatter-select-point"));
      await waitFor(() =>
        expect(screen.getByTestId("scatter-selected").children).toContain(
          "selected:[0]",
        ),
      );
    });

    test("switching scenarios clears the selected point", async () => {
      renderMinitool3();
      fireEvent.press(screen.getByTestId("scatter-select-point"));
      await waitFor(() =>
        expect(screen.getByTestId("scatter-selected").children).toContain(
          "selected:[0]",
        ),
      );

      fireEvent.press(screen.getByTestId("dropdown-option-local:dataset2"));
      await waitFor(() =>
        expect(screen.getByTestId("scatter-selected").children).toContain(
          "selected:[]",
        ),
      );
    });
  });

  describe("Upload modal", () => {
    test("upload modal is hidden by default and opens when button is pressed", async () => {
      renderMinitool3();
      expect(screen.queryByTestId("upload-modal")).toBeNull();

      fireEvent.press(screen.getByTestId("universe-button-Upload"));

      await waitFor(() =>
        expect(screen.getByTestId("upload-modal")).toBeTruthy(),
      );
      expect(screen.getByTestId("upload-modal-tooltype").children).toContain(
        "minitool3",
      );
    });

    test("closing the upload modal hides it", async () => {
      renderMinitool3();
      fireEvent.press(screen.getByTestId("universe-button-Upload"));
      await waitFor(() =>
        expect(screen.getByTestId("upload-modal")).toBeTruthy(),
      );

      fireEvent.press(screen.getByTestId("upload-modal-close"));
      await waitFor(() =>
        expect(screen.queryByTestId("upload-modal")).toBeNull(),
      );
    });

    test("a successful upload loads the new scenario into the chart and refetches the list", async () => {
      renderMinitool3();
      // Wait for initial fetch
      await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

      fireEvent.press(screen.getByTestId("universe-button-Upload"));
      await waitFor(() =>
        expect(screen.getByTestId("upload-modal")).toBeTruthy(),
      );

      // The success callback returns a scenario with 2 dataPoints
      fireEvent.press(screen.getByTestId("upload-modal-success"));

      await waitFor(() => {
        // Modal closes
        expect(screen.queryByTestId("upload-modal")).toBeNull();
        // New data is loaded into the chart
        expect(screen.getByTestId("scatter-data-length").children).toContain(
          "points:2",
        );
        // Scenarios are refetched (initial + post-upload = 2)
        expect(axios.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Responsive layout", () => {
    test("passes isMobile=true to controls when viewport width is small", () => {
      const useDimensions = require("../../hooks/useDimensions").default;
      useDimensions.mockReturnValue({ width: 400, height: 800 });

      renderMinitool3();

      expect(screen.getByTestId("controls-isMobile").children).toContain(
        "isMobile:true",
      );
    });

    test("passes isMobile=false to controls on desktop widths", () => {
      const useDimensions = require("../../hooks/useDimensions").default;
      useDimensions.mockReturnValue({ width: 1280, height: 800 });

      renderMinitool3();

      expect(screen.getByTestId("controls-isMobile").children).toContain(
        "isMobile:false",
      );
    });
  });
});
