import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import Svg, { Rect, Circle } from "react-native-svg";
import BatteryBar from "../minitool_one_components/BatteryBar";

// useSharedValue is mocked globally to return { value }
const makeSV = (v) => ({ value: v });

const renderInSvg = (ui) => render(<Svg>{ui}</Svg>);

const baseProps = {
  index: 0,
  chartWidth: 500,
  rangeStartX: makeSV(0),
  rangeEndX: makeSV(100),
  tool: false,
  dotsOnly: false,
  TOP_BUFFER: 10,
  MAX_LIFESPAN: 130,
  onBarPress: jest.fn(),
};

describe("BatteryBar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders both a bar (Rect) and a dot (Circle) by default", () => {
    const { UNSAFE_queryAllByType } = renderInSvg(
      <BatteryBar
        {...baseProps}
        item={{ brand: "Tough Cell", lifespan: 90 }}
      />,
    );
    expect(UNSAFE_queryAllByType(Rect).length).toBeGreaterThanOrEqual(1);
    expect(UNSAFE_queryAllByType(Circle).length).toBe(1);
  });

  test("renders only the dot (no Rect bar) when dotsOnly is true", () => {
    const { UNSAFE_queryAllByType } = renderInSvg(
      <BatteryBar
        {...baseProps}
        dotsOnly
        item={{ brand: "Tough Cell", lifespan: 90 }}
      />,
    );
    expect(UNSAFE_queryAllByType(Rect).length).toBe(0);
    expect(UNSAFE_queryAllByType(Circle).length).toBe(1);
  });

  test("uses Tough Cell green color for Tough Cell brand", () => {
    const { UNSAFE_queryAllByType } = renderInSvg(
      <BatteryBar
        {...baseProps}
        item={{ brand: "Tough Cell", lifespan: 60 }}
      />,
    );
    const rect = UNSAFE_queryAllByType(Rect)[0];
    expect(rect.props.fill).toBe("#33cc33");
  });

  test("uses Always Ready purple color for Always Ready brand", () => {
    const { UNSAFE_queryAllByType } = renderInSvg(
      <BatteryBar
        {...baseProps}
        item={{ brand: "Always Ready", lifespan: 60 }}
      />,
    );
    const rect = UNSAFE_queryAllByType(Rect)[0];
    expect(rect.props.fill).toBe("#cc00ff");
  });

  test("bar width scales with lifespan / MAX_LIFESPAN * chartWidth", () => {
    const { UNSAFE_queryAllByType } = renderInSvg(
      <BatteryBar
        {...baseProps}
        chartWidth={1000}
        MAX_LIFESPAN={100}
        item={{ brand: "Tough Cell", lifespan: 50 }}
      />,
    );
    const rect = UNSAFE_queryAllByType(Rect)[0];
    expect(rect.props.width).toBe(500);
  });

  test("pressing the bar invokes onBarPress with index and item", () => {
    const onBarPress = jest.fn();
    const item = { brand: "Tough Cell", lifespan: 70 };
    const { UNSAFE_queryAllByType } = renderInSvg(
      <BatteryBar
        {...baseProps}
        index={3}
        item={item}
        onBarPress={onBarPress}
      />,
    );
    const rect = UNSAFE_queryAllByType(Rect)[0];
    fireEvent.press(rect);
    expect(onBarPress).toHaveBeenCalledWith(3, item);
  });

  test("exposes a stable testID per index", () => {
    const { getByTestId } = renderInSvg(
      <BatteryBar
        {...baseProps}
        index={5}
        item={{ brand: "Tough Cell", lifespan: 50 }}
      />,
    );
    expect(getByTestId("battery-bar-5")).toBeTruthy();
  });
});
