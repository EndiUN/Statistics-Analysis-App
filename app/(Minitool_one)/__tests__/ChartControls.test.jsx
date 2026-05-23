import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react-native";
import { Switch } from "react-native";
import useChartControls from "../controls/ChartControls";

// Test harness: ChartControls is a hook, so wrap it in a tiny component that
// renders its controls and exposes state to the test via testID nodes.
const Harness = ({ width = 1024, onState }) => {
  const controls = useChartControls(width);
  React.useEffect(() => {
    onState?.(controls);
  });
  return controls.renderControls();
};

describe("ChartControls (useChartControls)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Layout & labels", () => {
    test("renders all switch labels and sort buttons", () => {
      render(<Harness />);
      expect(screen.getByText("Value Tool")).toBeTruthy();
      expect(screen.getByText("Range Tool")).toBeTruthy();
      expect(screen.getByText("Hide Green")).toBeTruthy();
      expect(screen.getByText("Hide Purple")).toBeTruthy();
      expect(screen.getByText("Dots Only")).toBeTruthy();
      expect(screen.getByText("Sort by Color")).toBeTruthy();
      expect(screen.getByText("Sort by Size")).toBeTruthy();
    });

    test("renders 5 switches in total", () => {
      render(<Harness />);
      const switches = screen.UNSAFE_getAllByType(Switch);
      expect(switches).toHaveLength(5);
    });

    test("renders without crashing on mobile width", () => {
      render(<Harness width={400} />);
      expect(screen.getByText("Value Tool")).toBeTruthy();
      expect(screen.getByText("Sort by Color")).toBeTruthy();
    });
  });

  describe("Switches", () => {
    test("toggling Value Tool switch updates state", () => {
      let state;
      render(<Harness onState={(s) => (state = s)} />);
      const switches = screen.UNSAFE_getAllByType(Switch);
      // Order: [valueTool, rangeTool, hideGreen, hidePurple, dotsOnly]
      act(() => fireEvent(switches[0], "valueChange", true));
      expect(state.valueToolActive).toBe(true);
    });

    test("toggling Range Tool switch updates state", () => {
      let state;
      render(<Harness onState={(s) => (state = s)} />);
      const switches = screen.UNSAFE_getAllByType(Switch);
      act(() => fireEvent(switches[1], "valueChange", true));
      expect(state.rangeToolActive).toBe(true);
    });

    test("toggling Hide Green / Hide Purple / Dots Only updates state", () => {
      let state;
      render(<Harness onState={(s) => (state = s)} />);
      const switches = screen.UNSAFE_getAllByType(Switch);
      act(() => fireEvent(switches[2], "valueChange", true));
      act(() => fireEvent(switches[3], "valueChange", true));
      act(() => fireEvent(switches[4], "valueChange", true));
      expect(state.hideGreenBars).toBe(true);
      expect(state.hidePurpleBars).toBe(true);
      expect(state.showDotsOnly).toBe(true);
    });
  });

  describe("Sort buttons (mutual exclusion)", () => {
    test("activating 'Sort by Color' enables color and disables size", () => {
      let state;
      render(<Harness onState={(s) => (state = s)} />);
      // Pre-activate size sort first
      act(() => state.setIsSortedBySize(true));
      act(() => fireEvent.press(screen.getByText("Sort by Color")));
      expect(state.isSortedByColor).toBe(true);
      expect(state.isSortedBySize).toBe(false);
    });

    test("activating 'Sort by Size' enables size and disables color", () => {
      let state;
      render(<Harness onState={(s) => (state = s)} />);
      act(() => state.setIsSortedByColor(true));
      act(() => fireEvent.press(screen.getByText("Sort by Size")));
      expect(state.isSortedBySize).toBe(true);
      expect(state.isSortedByColor).toBe(false);
    });

    test("pressing the same sort button toggles it off", () => {
      let state;
      render(<Harness onState={(s) => (state = s)} />);
      act(() => fireEvent.press(screen.getByText("Sort by Color")));
      expect(state.isSortedByColor).toBe(true);
      act(() => fireEvent.press(screen.getByText("Sort by Color")));
      expect(state.isSortedByColor).toBe(false);
    });
  });
});
