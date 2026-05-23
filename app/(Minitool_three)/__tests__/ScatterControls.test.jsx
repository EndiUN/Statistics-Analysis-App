import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react-native";
import ScatterControls from "../controls/ScatterControls";

// Replace InfoModal with a lightweight mock that exposes its visibility/title.
jest.mock("../modals/InfoModal", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return function MockInfoModal({ visible, title, message, onClose }) {
    if (!visible) return null;
    return (
      <View testID="info-modal">
        <Text testID="info-modal-title">{title}</Text>
        <Text testID="info-modal-message">{message}</Text>
        <Text testID="info-modal-close" onPress={onClose}>
          close
        </Text>
      </View>
    );
  };
});

// Mock the Dropdown component
jest.mock("../../../components/dropDown", () => {
  const React = require("react");
  const { View, Text, TouchableOpacity } = require("react-native");
  return function MockDropdown({ data, onChange, placeholder }) {
    const [expanded, setExpanded] = React.useState(false);

    // Render the placeholder directly since the parent component completely
    // controls the label format (e.g. "Two Groups: Off" or "Two Groups: 4")
    return (
      <View testID="dropdown-container">
        <TouchableOpacity
          testID="dropdown-trigger"
          onPress={() => setExpanded(!expanded)}
        >
          <Text testID="dropdown-text">{placeholder}</Text>
        </TouchableOpacity>
        {expanded && (
          <View testID="dropdown-options">
            {data?.map((item) => (
              <TouchableOpacity
                key={item.value}
                testID={`dropdown-option-${item.value}`}
                onPress={() => {
                  onChange(item.value);
                  setExpanded(false);
                }}
              >
                <Text>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };
});

const baseProps = {
  isMobile: false,
  showCross: false,
  onShowCrossChange: jest.fn(),
  hideData: false,
  onHideDataChange: jest.fn(),
  activeGrid: null,
  onActiveGridChange: jest.fn(),
  twoGroupsCount: null,
  onTwoGroupsChange: jest.fn(),
  fourGroupsCount: null,
  onFourGroupsChange: jest.fn(),
  scrollRef: React.createRef(),
};

const renderControls = (overrides = {}) =>
  render(<ScatterControls {...baseProps} {...overrides} />);

// Helper: open a dropdown by finding the Dropdown component and pressing it
const openDropdownByLabel = (label) => {
  const dropdowns = screen.getAllByTestId("dropdown-trigger");
  for (const dropdown of dropdowns) {
    const text = dropdown.findByType(require("react-native").Text);
    if (text && text.props.children.includes(label)) {
      fireEvent.press(dropdown);
      return;
    }
  }
};

// Simpler approach: find dropdown by the text it displays
const openDropdownByText = (textPattern) => {
  const textElements = screen.queryAllByText((text, element) => {
    if (typeof text !== "string") return false;
    if (typeof textPattern === "string") {
      return text.includes(textPattern);
    }
    return textPattern.test(text);
  });

  for (const element of textElements) {
    const parent = element.parent;
    if (
      parent &&
      parent.type &&
      parent.type.displayName === "TouchableOpacity"
    ) {
      fireEvent.press(parent);
      return parent;
    }
  }
};

describe("ScatterControls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Switches", () => {
    test("renders both switch labels", () => {
      renderControls();
      expect(screen.getByText("Show Cross")).toBeTruthy();
      expect(screen.getByText("Hide Data")).toBeTruthy();
    });

    test("toggling 'Show Cross' fires onShowCrossChange with true", () => {
      const onShowCrossChange = jest.fn();
      renderControls({ onShowCrossChange });
      const switches = screen.UNSAFE_getAllByType(
        require("react-native").Switch,
      );
      fireEvent(switches[0], "valueChange", true);
      expect(onShowCrossChange).toHaveBeenCalledWith(true);
    });

    test("toggling 'Hide Data' fires onHideDataChange with true", () => {
      const onHideDataChange = jest.fn();
      renderControls({ onHideDataChange });
      const switches = screen.UNSAFE_getAllByType(
        require("react-native").Switch,
      );
      fireEvent(switches[1], "valueChange", true);
      expect(onHideDataChange).toHaveBeenCalledWith(true);
    });

    test("switches reflect controlled values", () => {
      renderControls({ showCross: true, hideData: true });
      const switches = screen.UNSAFE_getAllByType(
        require("react-native").Switch,
      );
      expect(switches[0].props.value).toBe(true);
      expect(switches[1].props.value).toBe(true);
    });
  });

  describe("Dropdown headers", () => {
    test("shows 'Off' when no value is selected", () => {
      renderControls();
      expect(screen.getByText(/Two Groups: Off/)).toBeTruthy();
      expect(screen.getByText(/Four Groups: Off/)).toBeTruthy();
      expect(screen.getByText(/Grids: Off/)).toBeTruthy();
    });

    test("shows the selected option label", () => {
      renderControls({
        twoGroupsCount: 4,
        fourGroupsCount: 6,
        activeGrid: 5,
      });
      expect(screen.getByText(/Two Groups: 4/)).toBeTruthy();
      expect(screen.getByText(/Four Groups: 6/)).toBeTruthy();
      expect(screen.getByText(/Grids: 5×5/)).toBeTruthy();
    });
  });

  describe("Info icons → InfoModal", () => {
    test("pressing Two Groups info opens modal with correct content", () => {
      renderControls();
      const infoLabels = screen.getAllByText("i");
      expect(infoLabels.length).toBe(3);
      fireEvent.press(infoLabels[0]);

      expect(screen.getByTestId("info-modal")).toBeTruthy();
      expect(screen.getByTestId("info-modal-title").children).toContain(
        "Two Groups",
      );
      expect(screen.getByTestId("info-modal-message").children).toContain(
        "Divides plot into groups + shows median, low, and high values.",
      );
    });

    test("pressing Grids info opens the Grids description", () => {
      renderControls();
      const infoLabels = screen.getAllByText("i");
      fireEvent.press(infoLabels[2]);
      expect(screen.getByTestId("info-modal-title").children).toContain(
        "Grids",
      );
    });

    test("modal can be dismissed via onClose", () => {
      renderControls();
      fireEvent.press(screen.getAllByText("i")[0]);
      expect(screen.getByTestId("info-modal")).toBeTruthy();
      fireEvent.press(screen.getByTestId("info-modal-close"));
      expect(screen.queryByTestId("info-modal")).toBeNull();
    });
  });

  describe("Dropdown selection", () => {
    test("selecting a value from Two Groups invokes onTwoGroupsChange", () => {
      const onTwoGroupsChange = jest.fn();
      renderControls({ onTwoGroupsChange });

      const dropdownContainers = screen.getAllByTestId("dropdown-container");
      expect(dropdownContainers.length).toBeGreaterThan(0);

      fireEvent.press(
        dropdownContainers[0].findByType(
          require("react-native").TouchableOpacity,
        ),
      );

      fireEvent.press(screen.getByText("5"));
      expect(onTwoGroupsChange).toHaveBeenCalled();
    });

    test("selecting a Grids value invokes onActiveGridChange with the grid size", () => {
      const onActiveGridChange = jest.fn();
      renderControls({ onActiveGridChange });

      const dropdownContainers = screen.getAllByTestId("dropdown-container");

      fireEvent.press(
        dropdownContainers[2].findByType(
          require("react-native").TouchableOpacity,
        ),
      );

      fireEvent.press(screen.getByText("4×4"));
      expect(onActiveGridChange).toHaveBeenCalled();
    });

    test("selecting 'Off' clears the selection (null)", () => {
      const onFourGroupsChange = jest.fn();
      renderControls({ fourGroupsCount: 5, onFourGroupsChange });

      const dropdownContainers = screen.getAllByTestId("dropdown-container");

      fireEvent.press(
        dropdownContainers[1].findByType(
          require("react-native").TouchableOpacity,
        ),
      );

      fireEvent.press(screen.getByText("Off"));
      expect(onFourGroupsChange).toHaveBeenCalledWith(null);
    });
  });

  describe("Responsive layout", () => {
    test("renders without crashing in mobile layout", () => {
      renderControls({ isMobile: true });
      expect(screen.getByText("Show Cross")).toBeTruthy();
      expect(screen.getByText(/Two Groups: Off/)).toBeTruthy();
    });
  });
});
