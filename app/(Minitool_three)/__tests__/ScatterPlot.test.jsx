import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Circle } from "react-native-svg";

// The global gesture-handler mock doesn't include all chained methods used by
// ScatterPlot (e.g. .minDistance). Extend the mock locally to keep the
// component renderable in tests.
jest.mock("react-native-gesture-handler", () => {
  const { View, ScrollView } = require("react-native");
  const createMockGesture = () => {
    const obj = {};
    const methods = [
      "activeOffsetX",
      "activeOffsetY",
      "runOnJS",
      "onBegin",
      "onStart",
      "onUpdate",
      "onEnd",
      "onFinalize",
      "minDistance",
      "maxPointers",
      "minPointers",
      "enabled",
    ];
    methods.forEach((m) => (obj[m] = jest.fn(() => obj)));
    return obj;
  };
  return {
    ScrollView,
    GestureHandlerRootView: View,
    GestureDetector: ({ children }) => children,
    Gesture: { Pan: createMockGesture, Tap: createMockGesture },
    State: {},
    Directions: {},
  };
});

import ScatterPlot from "../chart_components/ScatterPlot";

// Stable dimensions for SVG layout calculations
jest.mock("../../hooks/useDimensions", () => ({
  __esModule: true,
  default: () => ({ width: 1024, height: 768 }),
}));

const sampleData = [
  { x: 1, y: 10 },
  { x: 2, y: 20 },
  { x: 3, y: 30 },
  { x: 4, y: 40 },
  { x: 5, y: 50 },
];

describe("ScatterPlot", () => {
  test("renders one Circle per data point", () => {
    const { UNSAFE_queryAllByType } = render(
      <ScatterPlot data={sampleData} width={800} height={500} />,
    );
    const circles = UNSAFE_queryAllByType(Circle);
    // At minimum, one circle per point. Overlays may add more, so check >=.
    expect(circles.length).toBeGreaterThanOrEqual(sampleData.length);
  });

  test("renders without crashing when data is empty", () => {
    const { UNSAFE_queryAllByType } = render(
      <ScatterPlot data={[]} width={800} height={500} />,
    );
    // No data points → only overlays / axes
    const circles = UNSAFE_queryAllByType(Circle);
    expect(circles.length).toBe(0);
  });

  test("calls onPointSelect with the index when a point is tapped", () => {
    const onPointSelect = jest.fn();
    const { UNSAFE_queryAllByType } = render(
      <ScatterPlot
        data={sampleData}
        width={800}
        height={500}
        onPointSelect={onPointSelect}
      />,
    );
    const circles = UNSAFE_queryAllByType(Circle);
    fireEvent.press(circles[0]);
    expect(onPointSelect).toHaveBeenCalledWith(0);
  });

  test("tapping the currently selected point deselects it (null)", () => {
    const onPointSelect = jest.fn();
    const { UNSAFE_queryAllByType } = render(
      <ScatterPlot
        data={sampleData}
        width={800}
        height={500}
        selectedPoint={2}
        onPointSelect={onPointSelect}
      />,
    );
    const circles = UNSAFE_queryAllByType(Circle);
    // The selected point is the third data circle. Find it by checking which
    // circle has the highlighted fill (#f59e0b) and a larger radius.
    const dataCircles = circles.filter(
      (c) => c.props.fill === "#2563eb" || c.props.fill === "#f59e0b",
    );
    fireEvent.press(dataCircles[2]);
    expect(onPointSelect).toHaveBeenCalledWith(null);
  });

  test("hideData=true renders data circles with opacity 0", () => {
    const { UNSAFE_queryAllByType } = render(
      <ScatterPlot data={sampleData} width={800} height={500} hideData />,
    );
    const circles = UNSAFE_queryAllByType(Circle);
    const dataCircles = circles.filter(
      (c) => c.props.fill === "#2563eb" || c.props.fill === "#f59e0b",
    );
    dataCircles.forEach((c) => expect(c.props.opacity).toBe(0));
  });

  test("renders the cross overlay when showCross is true", () => {
    const onScrollEnabled = jest.fn();
    const { UNSAFE_queryAllByType } = render(
      <ScatterPlot
        data={sampleData}
        width={800}
        height={500}
        showCross
        onScrollEnabled={onScrollEnabled}
      />,
    );
    // Cross adds two extra circles (red center + white inner dot)
    const redCircles = UNSAFE_queryAllByType(Circle).filter(
      (c) => c.props.fill === "#dc2626",
    );
    expect(redCircles.length).toBeGreaterThan(0);
  });

  test("does not render the cross overlay when showCross is false", () => {
    const { UNSAFE_queryAllByType } = render(
      <ScatterPlot data={sampleData} width={800} height={500} />,
    );
    const redCircles = UNSAFE_queryAllByType(Circle).filter(
      (c) => c.props.fill === "#dc2626",
    );
    expect(redCircles.length).toBe(0);
  });

  test("highlights the selected point with a larger radius", () => {
    const { UNSAFE_queryAllByType } = render(
      <ScatterPlot
        data={sampleData}
        width={800}
        height={500}
        selectedPoint={1}
      />,
    );
    const highlighted = UNSAFE_queryAllByType(Circle).filter(
      (c) => c.props.fill === "#f59e0b" && c.props.r === 6,
    );
    expect(highlighted.length).toBeGreaterThanOrEqual(1);
  });

  test("does not crash when activeGrid / twoGroupsCount / fourGroupsCount are set", () => {
    expect(() =>
      render(
        <ScatterPlot
          data={sampleData}
          width={800}
          height={500}
          activeGrid={4}
        />,
      ),
    ).not.toThrow();

    expect(() =>
      render(
        <ScatterPlot
          data={sampleData}
          width={800}
          height={500}
          twoGroupsCount={4}
        />,
      ),
    ).not.toThrow();

    expect(() =>
      render(
        <ScatterPlot
          data={sampleData}
          width={800}
          height={500}
          fourGroupsCount={4}
        />,
      ),
    ).not.toThrow();
  });
});
