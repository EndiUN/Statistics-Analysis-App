import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  render,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react-native";
import axios from "axios";
import Minitool_1 from "../minitool_1";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

// Mock useDimensions hook
import useDimensions from "../../hooks/useDimensions";
jest.mock("../../hooks/useDimensions", () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock BatteryBar component
jest.mock("../minitool_one_components/BatteryBar", () => {
  return jest.fn((props) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(
      Text,
      {
        testID: `battery-bar-${props.index}`,
        onPress: () => props.onBarPress(props.index, props.item),
      },
      `${props.dotsOnly ? "Dot" : "Bar"} - ${props.item.brand}: ${props.item.lifespan}`,
    );
  });
});

// Mock ValueTool component
jest.mock("../tools/ValueTool", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockValueTool(props) {
    return {
      translateX: { value: 100 },
      animatedLabelStyle: {},
      renderValueTool: () =>
        props.isActive ? (
          <Text
            testID="value-tool-trigger"
            onPress={() => props.onValueChange(95.5)}
          >
            Simulate Value Drag
          </Text>
        ) : null,
    };
  };
});

// Mock RangeTool component
jest.mock("../tools/RangeTool", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockRangeTool(props) {
    return {
      rangeStartX: { value: 50 },
      rangeEndX: { value: 150 },
      animatedRangeLabelStyle: {},
      renderRangeTool: () =>
        props.isActive ? (
          <Text
            testID="range-tool-trigger"
            onPress={() => props.onCountChange(12)}
          >
            Simulate Range Drag
          </Text>
        ) : null,
    };
  };
});

// Mock ChartControls component
jest.mock("../controls/ChartControls", () => {
  const React = require("react");
  const { Text, View } = require("react-native");

  return function MockChartControls(props) {
    // All necessary boolean states
    const [size, setSize] = React.useState(false);
    const [color, setColor] = React.useState(false);
    const [valueTool, setValueTool] = React.useState(false);
    const [rangeTool, setRangeTool] = React.useState(false);
    const [hideGreen, setHideGreen] = React.useState(false);
    const [hidePurple, setHidePurple] = React.useState(false);
    const [dotsOnly, setDotsOnly] = React.useState(false);

    return {
      valueToolActive: valueTool,
      rangeToolActive: rangeTool,
      setValueToolActive: setValueTool,
      setRangeToolActive: setRangeTool,
      isSortedByColor: color,
      isSortedBySize: size,
      setIsSortedByColor: setColor,
      setIsSortedBySize: setSize,
      hideGreenBars: hideGreen,
      hidePurpleBars: hidePurple,
      showDotsOnly: dotsOnly,

      // Render clickable triggers for all 7 interactions
      renderControls: () => (
        <View testID="mock-controls-container">
          <Text onPress={() => setSize(!size)}>Switch Sort Size</Text>
          <Text onPress={() => setColor(!color)}>Switch Sort Color</Text>
          <Text onPress={() => setValueTool(!valueTool)}>
            Toggle Value Tool
          </Text>
          <Text onPress={() => setRangeTool(!rangeTool)}>
            Toggle Range Tool
          </Text>
          <Text onPress={() => setHideGreen(!hideGreen)}>
            Toggle Hide Green
          </Text>
          <Text onPress={() => setHidePurple(!hidePurple)}>
            Toggle Hide Purple
          </Text>
          <Text onPress={() => setDotsOnly(!dotsOnly)}>Toggle Dots Only</Text>
        </View>
      ),
    };
  };
});

// Mock DataGenerationModal component
jest.mock("../modals/DataGenerationModal", () => {
  return (props) => {
    const React = require("react");
    const { Text } = require("react-native");
    return {
      isModalVisible: false,
      handleOpenModal: jest.fn(),
      renderModal: () => (
        <Text
          testID="mock-upload-trigger"
          onPress={() =>
            props.onDataGenerated([
              { brand: "Tough Cell", lifespan: 120 },
              { brand: "Always Ready", lifespan: 40 },
            ])
          }
        >
          Inject New Data
        </Text>
      ),
    };
  };
});

// Mock BarGenerationModal component
jest.mock("../modals/BarGenerationModal", () => {
  return function MockBarGenerationModal(props) {
    const { Text } = require("react-native");
    return {
      isModalVisible: false,
      handleOpenModal: jest.fn(),
      renderModal: () => (
        <Text
          testID="mock-add-bar-trigger"
          onPress={() =>
            props.onBarAdded({ brand: "Tough Cell", lifespan: 150 })
          }
        >
          Add Custom Bar
        </Text>
      ),
    };
  };
});

// Mock BarInfoModal component
jest.mock("../modals/BarInfoModal", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return function MockBarInfoModal({ visible, barData, onDelete, onClose }) {
    if (!visible) return null;
    return (
      <View testID="bar-info-modal">
        <Text testID="selected-bar-info">
          {barData?.brand}: {barData?.lifespan}
        </Text>
        <Text testID="confirm-delete-bar" onPress={onDelete}>
          Delete Bar
        </Text>
        <Text testID="close-bar-info" onPress={onClose}>
          Close
        </Text>
      </View>
    );
  };
});

// Mock DropDown component
jest.mock("../../../components/dropDown", () => {
  const { View, Text } = require("react-native");
  return function MockDropdown({ data, placeholder }) {
    return (
      <View testID="scenario-dropdown">
        <Text>{placeholder}</Text>
        {data.map((item) => (
          <Text key={item.value}>{item.label}</Text>
        ))}
      </View>
    );
  };
});

// Mock UniverseButton component
jest.mock("../../../components/universeButton", () => {
  const { Text: RNText } = require("react-native");
  return function MockUniverseButton({ title, onPress }) {
    return (
      <RNText onPress={onPress} testID={`button-${title}`}>
        {title}
      </RNText>
    );
  };
});

// Mock initial scenario data
jest.mock("../../../data/batteryScenario_set.json", () => ({
  __esModule: true,
  default: [
    { brand: "Tough Cell", lifespan: 50 },
    { brand: "Always Ready", lifespan: 10 },
    { brand: "Tough Cell", lifespan: 80 },
    { brand: "Always Ready", lifespan: 75 },
    { brand: "Tough Cell", lifespan: 60 },
  ],
}));

describe("Minitool_1 Advanced Integration Tests", () => {
  beforeEach(() => {
    useDimensions.mockReturnValue({ width: 1024, height: 768 });
    jest.clearAllMocks();
    axios.get.mockResolvedValue({ data: { success: true, data: [] } });
    global.alert = jest.fn();
  });

  describe("Data State Management", () => {
    test("maintains battery data throughout component lifecycle", async () => {
      const { rerender } = render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      // Initial mount and verify the actual values from mock data
      await waitFor(() => {
        expect(screen.getByTestId("stat-amount").children).toContain("5");
        expect(screen.getByTestId("stat-min").children).toContain("10");
      });

      // Force a re-render
      rerender(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      // Verify data is still correct after re-render
      expect(screen.getByTestId("stat-amount").children).toContain("5");
      expect(screen.getByTestId("stat-min").children).toContain("10");
      expect(screen.getByText("Battery Lifespan Comparison")).toBeTruthy();
    });

    test("updates statistics when data changes", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("stat-amount").children).toContain("5");
        expect(screen.getByTestId("stat-min").children).toContain("10");
        expect(screen.getByTestId("stat-max").children).toContain("80");
      });

      const uploadTrigger = screen.getByTestId("mock-upload-trigger");
      fireEvent.press(uploadTrigger);

      await waitFor(() => {
        expect(screen.getByTestId("stat-amount").children).toContain("2");
        expect(screen.getByTestId("stat-min").children).toContain("40");
        expect(screen.getByTestId("stat-max").children).toContain("120");
      });

      expect(screen.queryByText("80")).toBeNull();
    });
  });

  describe("API Integration", () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      // Restore the original console.error after the tests finish
      consoleSpy.mockRestore();
    });

    test("successfully fetches and displays scenarios in the dropdown on mount", async () => {
      const mockScenarios = [
        { _id: "1", name: "Morning Battery Test", toolType: "minitool1" },
        { _id: "2", name: "Evening Stress Test", toolType: "minitool1" },
      ];

      axios.get.mockResolvedValueOnce({
        data: { success: true, data: mockScenarios },
      });

      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      // Verify the API call happened
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "https://statistics-api-4g2s.onrender.com/api/scenarios",
        );
      });

      //  Verify the UI updated
      // This ensures the filtering and state updates actually worked
      await waitFor(() => {
        expect(screen.getByText("Morning Battery Test")).toBeTruthy();
        expect(screen.getByText("Evening Stress Test")).toBeTruthy();
      });
    });

    test("handles scenario fetch failure gracefully", async () => {
      axios.get.mockRejectedValueOnce({
        code: "ERR_NETWORK",
        message: "Network Error",
      });

      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining("Connection Error"),
        );
      });
    });

    test("filters minitool1 scenarios correctly for the custom DropDown", async () => {
      const allScenariosFromDB = [
        { _id: "1", name: "Battery Scenario A", toolType: "minitool1" },
        { _id: "2", name: "Solar Panel Tool", toolType: "minitool2" }, // Different tool
        { _id: "3", name: "Battery Scenario B", toolType: "minitool1" },
      ];

      // Mock the API to return the mixed list
      axios.get.mockResolvedValueOnce({
        data: {
          success: true,
          data: allScenariosFromDB,
        },
      });

      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      // Wait for the async filtering to finish and the UI to update
      await waitFor(() => {
        // 1. Verify "minitool1" items are present in the dropdown
        expect(screen.getByText("Battery Scenario A")).toBeTruthy();
        expect(screen.getByText("Battery Scenario B")).toBeTruthy();

        // 2. Verify "minitool2" items were filtered out
        expect(screen.queryByText("Solar Panel Tool")).toBeNull();
      });
    });
  });

  describe("Core UI and Accessibility", () => {
    test("renders all essential layout elements and legend", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      // Title and Legend
      expect(
        await screen.findByText("Battery Lifespan Comparison"),
      ).toBeTruthy();
      expect(screen.getByText("Tough Cell")).toBeTruthy();
      expect(screen.getByText("Always Ready")).toBeTruthy();

      // Statistics labels
      expect(screen.getByText("Amount")).toBeTruthy();
      expect(screen.getByText("Min")).toBeTruthy();
      expect(screen.getByText("Max")).toBeTruthy();

      // Primary action buttons
      expect(screen.getByText("ADD BAR")).toBeTruthy();
      expect(screen.getByText("Generate")).toBeTruthy();
    });

    test("maintains UI structure across re-renders", async () => {
      const { rerender } = render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );
      expect(
        await screen.findByText("Battery Lifespan Comparison"),
      ).toBeTruthy();

      rerender(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );
      expect(screen.getByText("Battery Lifespan Comparison")).toBeTruthy();
      expect(screen.getByText("Amount")).toBeTruthy();
    });

    test("remains functional after rapid interactions and modal cycles", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );
      const addBarBtn = await screen.findByText("ADD BAR");
      const generateBtn = screen.getByText("Generate");

      for (let i = 0; i < 3; i++) {
        fireEvent.press(addBarBtn);
        fireEvent.press(generateBtn);
      }

      expect(screen.queryByText("ADD BAR")).not.toBeNull();
      expect(screen.queryByText("Generate")).not.toBeNull();

      expect(screen.getByText("Battery Lifespan Comparison")).toBeTruthy();
    });
  });

  describe("Help System", () => {
    test("help content is complete", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      const helpToggle = screen.getByText(/About This Battery Chart/);
      fireEvent.press(helpToggle);

      expect(await screen.findByText("What is this?")).toBeTruthy();
      expect(await screen.findByText("Why is it useful?")).toBeTruthy();
      expect(await screen.findByText("What can you do?")).toBeTruthy();
    });

    test("help can be toggled multiple times and actually disappears", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      const helpToggle = await screen.findByText(/About This Battery Chart/);

      // 1. Toggle ON
      fireEvent.press(helpToggle);
      expect(await screen.findByText("What is this?")).toBeTruthy();

      // 2. Toggle OFF
      fireEvent.press(helpToggle);
      await waitFor(() => {
        expect(screen.queryByText("What is this?")).toBeNull();
      });

      // 3. Toggle ON again
      fireEvent.press(helpToggle);
      expect(await screen.findByText("What is this?")).toBeTruthy();
    });
  });

  describe("User Interactions", () => {
    test("sorts batteries by size (descending) when switch is toggled", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      // Mocked "switch"
      const sizeSwitch = await screen.findByText("Switch Sort Size");
      fireEvent.press(sizeSwitch);

      await waitFor(() => {
        const bars = screen.getAllByTestId(/battery-bar-/);

        expect(bars[0].props.children).toContain("80");
        expect(bars[1].props.children).toContain("75");
        expect(bars[2].props.children).toContain("60");
        expect(bars[3].props.children).toContain("50");
        expect(bars[4].props.children).toContain("10");
      });
    });

    test("sorts batteries by color (brand name) when switch is toggled", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      const colorSwitch = await screen.findByText("Switch Sort Color");
      fireEvent.press(colorSwitch);

      await waitFor(() => {
        const bars = screen.getAllByTestId(/battery-bar-/);

        expect(bars[0].props.children).toContain("Always Ready");
        expect(bars[1].props.children).toContain("Always Ready");
        expect(bars[2].props.children).toContain("Tough Cell");
        expect(bars[3].props.children).toContain("Tough Cell");
        expect(bars[4].props.children).toContain("Tough Cell");
      });
    });

    test("prioritizes size sort over color sort if both are active", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      const sizeSwitch = await screen.findByText("Switch Sort Size");
      const colorSwitch = await screen.findByText("Switch Sort Color");

      // Activate both
      fireEvent.press(colorSwitch);
      fireEvent.press(sizeSwitch);

      await waitFor(() => {
        const bars = screen.getAllByTestId(/battery-bar-/);
        expect(bars[0].props.children).toContain("80");
      });
    });

    test("can select a bar and delete it from the dataset", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("stat-amount").children).toContain("5");
      });

      //Click the first bar (Tough Cell: 50)
      const firstBar = screen.getByTestId("battery-bar-0");
      fireEvent.press(firstBar);

      // Verify Modal opens with correct data
      const infoText = await screen.findByTestId("selected-bar-info");
      expect(infoText.props.children.join("")).toContain("Tough Cell: 50");

      // Press Delete in the modal
      const deleteBtn = screen.getByTestId("confirm-delete-bar");
      fireEvent.press(deleteBtn);

      // Verify the amount decreased and modal closed
      await waitFor(() => {
        expect(screen.getByTestId("stat-amount").children).toContain("4");
        expect(screen.queryByTestId("bar-info-modal")).toBeNull();
      });

      // Verify the specific bar (50) is gone
      expect(screen.queryByText(/Tough Cell: 50/)).toBeNull();
    });

    test("can add a new individual bar and verify stats update", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("stat-amount").children).toContain("5");
        expect(screen.getByTestId("stat-max").children).toContain("80");
      });

      // Open the Add Bar modal
      const addBarBtn = screen.getByText("ADD BAR");
      fireEvent.press(addBarBtn);

      // Trigger the addition of a new bar (Tough Cell: 150)
      const addTrigger = screen.getByTestId("mock-add-bar-trigger");
      fireEvent.press(addTrigger);

      // 4. Verify the the added data
      await waitFor(() => {
        expect(screen.getByTestId("stat-amount").children).toContain("6");
        expect(screen.getByTestId("stat-max").children).toContain("150");
      });

      expect(screen.getByText(/Tough Cell: 150/)).toBeTruthy();
    });

    test("completes full user workflow: view -> help -> generate data", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      // 1. Initial render
      expect(
        await screen.findByText("Battery Lifespan Comparison"),
      ).toBeTruthy();

      // 2. Open Help and verify visibility
      const helpToggle = await screen.findByText(/About This Battery Chart/);
      fireEvent.press(helpToggle);

      expect(await screen.findByText("What is this?")).toBeTruthy();

      // 3. Close Help and verify it DISAPPEARS
      fireEvent.press(helpToggle);
      await waitFor(() => {
        expect(screen.queryByText("What is this?")).toBeNull();
      });

      // 4. Interact with Generate Modal
      const generateBtn = await screen.findByText("Generate");
      fireEvent.press(generateBtn);

      await waitFor(() => {
        const uploadTrigger = screen.queryByText("ADD BAR");
        expect(uploadTrigger).toBeTruthy();
      });
    });

    test("can generate new data and verify stats update", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      // Initial state (Mock starts with 5 items)
      await waitFor(() => {
        expect(screen.getByTestId("stat-amount").children).toContain("5");
      });

      // Open the Generate Modal
      const generateBtn = await screen.findByText("Generate");
      fireEvent.press(generateBtn);

      // Generate New Data
      const injectBtn = screen.getByTestId("mock-upload-trigger");
      fireEvent.press(injectBtn);

      // Verify the UI reflects the "Generated" data
      await waitFor(() => {
        expect(screen.getByTestId("stat-amount").children).toContain("2");
        expect(screen.getByTestId("stat-min").children).toContain("40");
      });
    });

    test("buttons remain visible and interactive after multiple modal cycles", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      const addBarText = "ADD BAR";
      const generateText = "Generate";

      expect(await screen.findByText(addBarText)).toBeTruthy();
      expect(await screen.findByText(generateText)).toBeTruthy();

      // Cycle 1: Open and "interact" with Generate
      fireEvent.press(screen.getByText(generateText));
      expect(screen.getByText(generateText)).toBeTruthy();

      // Cycle 2: Open and "interact" with ADD BAR
      fireEvent.press(screen.getByText(addBarText));
      expect(screen.getByText(addBarText)).toBeTruthy();

      // Final consistency check
      expect(screen.queryByText(addBarText)).not.toBeNull();
      expect(screen.queryByText(generateText)).not.toBeNull();
    });

    test("hides green bars (Tough Cell) correctly", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      await screen.findByText("Battery Lifespan Comparison");

      const toggle = await screen.findByText("Toggle Hide Green");
      fireEvent.press(toggle);

      await waitFor(() => {
        const currentBarLabels = screen
          .queryAllByTestId(/battery-bar-/)
          .map((bar) => bar.props.children);

        const toughCellVisible = currentBarLabels.some((label) =>
          label.includes("Tough Cell"),
        );
        expect(toughCellVisible).toBe(false);

        const alwaysReadyVisible = currentBarLabels.some((label) =>
          label.includes("Always Ready"),
        );
        expect(alwaysReadyVisible).toBe(true);
      });
    });

    test("hides purple bars (Always Ready) correctly", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      await screen.findByText("Battery Lifespan Comparison");

      const toggle = await screen.findByText("Toggle Hide Purple");
      fireEvent.press(toggle);

      await waitFor(() => {
        const currentBarLabels = screen
          .queryAllByTestId(/battery-bar-/)
          .map((bar) => bar.props.children);

        const alwaysReadyVisible = currentBarLabels.some((label) =>
          label.includes("Always Ready"),
        );
        expect(alwaysReadyVisible).toBe(false);

        const toughCellVisible = currentBarLabels.some((label) =>
          label.includes("Tough Cell"),
        );
        expect(toughCellVisible).toBe(true);
      });
    });

    test("switches bars to dot representation when Toggle Dots Only is active", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );
      expect(screen.getAllByText(/Bar -/)[0]).toBeTruthy();

      const toggle = await screen.findByText("Toggle Dots Only");
      fireEvent.press(toggle);

      await waitFor(() => {
        const dots = screen.getAllByText(/Dot -/);
        expect(dots.length).toBeGreaterThan(0);

        expect(screen.queryByText(/Bar -/)).toBeNull();
      });
    });
  });

  describe("Tool Interactions", () => {
    test("ValueTool: toggling displays label and updating changes value", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      // Enable the tool via the control switch
      const toggle = await screen.findByText("Toggle Value Tool");
      fireEvent.press(toggle);

      // Verify the tool's interactive element appeared
      const trigger = await screen.findByTestId("value-tool-trigger");
      expect(trigger).toBeTruthy();

      // Simulate a value change (dragging the line)
      fireEvent.press(trigger);

      // Verify the label updates to the new value
      await waitFor(() => {
        expect(screen.getByText("95.5")).toBeTruthy();
      });
    });

    test("RangeTool: toggling displays count and updating changes count", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      // Enable the tool
      const toggle = await screen.findByText("Toggle Range Tool");
      fireEvent.press(toggle);

      // Verify the count label appears in its initial state (0)
      expect(await screen.findByText("count: 0")).toBeTruthy();

      // Simulate a range adjustment
      const trigger = await screen.findByTestId("range-tool-trigger");
      fireEvent.press(trigger);

      // Verify the UI updates the count display
      await waitFor(() => {
        expect(screen.getByText("count: 12")).toBeTruthy();
      });
    });
  });

  describe("Error Handling - Edge Cases", () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test("handles malformed scenario response without crashing or loading data", async () => {
      // Simulate a successful API call that returns a failure flag
      axios.get.mockResolvedValueOnce({
        data: { success: false, error: "Invalid data format" },
      });

      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
        // Ensure the dropdown still shows the placeholder and no invalid scenarios
        expect(screen.getByText("Select scenario")).toBeTruthy();
        expect(screen.queryByText("Invalid data format")).toBeNull();
      });
    });

    test("displays specific error message for general API failure", async () => {
      axios.get.mockRejectedValueOnce(new Error("Server error"));

      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      await waitFor(() => {
        // Verify the specific message for general errors
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining("Failed to fetch scenarios from database"),
        );
      });

      // Core UI remains stable even when side-data fails
      expect(
        await screen.findByText("Battery Lifespan Comparison"),
      ).toBeTruthy();
    });

    test("handles network-specific errors with a connection warning", async () => {
      axios.get.mockRejectedValueOnce({
        code: "ERR_NETWORK",
      });

      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      await waitFor(() => {
        // Connection-specific alert branch
        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining(
            "Connection Error. Unable to connect to database",
          ),
        );
      });
    });

    test("recovers and maintains default battery data when API fails", async () => {
      axios.get.mockRejectedValueOnce(new Error("Timeout"));

      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      await waitFor(() => expect(global.alert).toHaveBeenCalled());

      // Verify that the chart still renders the default 5 mock batteries
      const bars = screen.queryAllByTestId(/battery-bar-/);
      expect(bars.length).toBeGreaterThan(0);
      expect(screen.getByTestId("stat-amount").children).toContain("5");
    });
  });

  describe("Responsive Behavior", () => {
    test("renders the vertical sidebar on desktop dimensions", async () => {
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      await waitFor(() => {
        const desktopStatsBar = screen.getByTestId("stats-bar");
        expect(desktopStatsBar).toBeTruthy();
        expect(screen.getByText("Select scenario")).toBeTruthy();
        expect(desktopStatsBar.props.style).toContainEqual(
          expect.objectContaining({ width: 120 }),
        );
      });
      const mobileStatsBar = await screen.queryByTestId("mobile-stats-bar");
      expect(mobileStatsBar).toBeNull();
    });

    test("adapts to mobile dimensions", async () => {
      useDimensions.mockReturnValue({ width: 375, height: 667 }); // Set to mobile dimensions
      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("mobile-stats-bar")).toBeTruthy();
        expect(screen.getByText("Select scenario")).toBeTruthy();
      });

      expect(screen.queryByTestId("stats-bar")).toBeNull();
    });

    test("adapts to tablet dimensions with specific sidebar width", async () => {
      useDimensions.mockReturnValue({ width: 600, height: 800 });

      render(
        <SafeAreaProvider>
          <Minitool_1 />
        </SafeAreaProvider>,
      );

      await waitFor(() => {
        const desktopStatsBar = screen.getByTestId("stats-bar");
        expect(desktopStatsBar).toBeTruthy();
        expect(screen.getByText("Select scenario")).toBeTruthy();
        expect(desktopStatsBar.props.style).toContainEqual(
          expect.objectContaining({ width: 100 }),
        );
      });

      const mobileStatsBar = await screen.queryByTestId("mobile-stats-bar");
      expect(mobileStatsBar).toBeNull();
    });
  });
});
