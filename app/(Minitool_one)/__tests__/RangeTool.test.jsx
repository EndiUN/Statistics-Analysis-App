import React from "react";
import { render } from "@testing-library/react-native";
import Svg, { Rect, Line } from "react-native-svg";

import useRangeTool from "../tools/RangeTool";

const Harness = React.forwardRef((props, ref) => {
  const tool = useRangeTool(props);
  React.useImperativeHandle(ref, () => tool, [tool]);
  return <Svg>{tool.renderRangeTool()}</Svg>;
});

const baseProps = {
  isActive: true,
  onActiveChange: jest.fn(),
  onRangeChange: jest.fn(),
  onCountChange: jest.fn(),
  chartWidth: 500,
  chartHeight: 300,
  maxLifespan: 130,
  initialStartValue: 50,
  initialEndValue: 100,
  rangeHandleSize: 15,
  rangeToolColor: "#0000FF",
  displayedData: [
    { brand: "Tough Cell", lifespan: 60, visible: true },
    { brand: "Always Ready", lifespan: 75, visible: true },
    { brand: "Tough Cell", lifespan: 200, visible: true },
  ],
  X_AXIS_HEIGHT: 30,
  TOP_BUFFER: 10,
};

describe("RangeTool (useRangeTool)", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders the highlight rect, two boundary lines, and three handles", () => {
    const { UNSAFE_queryAllByType } = render(<Harness {...baseProps} />);
    // 1 highlight + 3 handle rects = 4 rects total
    expect(UNSAFE_queryAllByType(Rect).length).toBe(4);
    // Two vertical boundary lines
    expect(UNSAFE_queryAllByType(Line).length).toBe(2);
  });

  test("applies the configured rangeToolColor to lines and handles", () => {
    const { UNSAFE_queryAllByType } = render(
      <Harness {...baseProps} rangeToolColor="#123456" />,
    );
    const lines = UNSAFE_queryAllByType(Line);
    const rects = UNSAFE_queryAllByType(Rect);
    lines.forEach((l) => expect(l.props.stroke).toBe("#123456"));
    rects.forEach((r) => expect(r.props.fill).toBe("#123456"));
  });

  test("initial start/end shared values are derived from props", () => {
    const ref = React.createRef();
    render(<Harness ref={ref} {...baseProps} />);
    expect(ref.current.rangeStartX.value).toBeCloseTo((50 / 130) * 500, 1);
    expect(ref.current.rangeEndX.value).toBeCloseTo((100 / 130) * 500, 1);
  });

  test("renders without crashing when isActive=false", () => {
    const { UNSAFE_queryAllByType } = render(
      <Harness {...baseProps} isActive={false} />,
    );
    expect(UNSAFE_queryAllByType(Rect).length).toBe(4);
  });

  test("handleToggle forwards new active value to onActiveChange", () => {
    const onActiveChange = jest.fn();
    const ref = React.createRef();
    render(
      <Harness ref={ref} {...baseProps} onActiveChange={onActiveChange} />,
    );
    ref.current.handleToggle(false);
    expect(onActiveChange).toHaveBeenCalledWith(false);
  });
});
