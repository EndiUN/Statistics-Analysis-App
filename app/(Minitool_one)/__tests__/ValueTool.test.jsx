import React from "react";
import { render } from "@testing-library/react-native";
import Svg, { Rect, Line } from "react-native-svg";

import useValueTool from "../tools/ValueTool";

const Harness = React.forwardRef((props, ref) => {
  const tool = useValueTool(props);
  React.useImperativeHandle(ref, () => tool, [tool]);
  return <Svg>{tool.renderValueTool()}</Svg>;
});

const baseProps = {
  isActive: true,
  onActiveChange: jest.fn(),
  onValueChange: jest.fn(),
  chartWidth: 500,
  chartHeight: 300,
  maxLifespan: 130,
  toolValue: 80,
  toolColor: "red",
  X_AXIS_HEIGHT: 30,
  TOP_BUFFER: 10,
};

describe("ValueTool (useValueTool)", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders the vertical line and the drag handle", () => {
    const { UNSAFE_queryAllByType } = render(<Harness {...baseProps} />);
    expect(UNSAFE_queryAllByType(Line).length).toBeGreaterThanOrEqual(1);
    expect(UNSAFE_queryAllByType(Rect).length).toBeGreaterThanOrEqual(1);
  });

  test("uses the configured toolColor on the line and handle", () => {
    const { UNSAFE_queryAllByType } = render(
      <Harness {...baseProps} toolColor="#abcdef" />,
    );
    const line = UNSAFE_queryAllByType(Line)[0];
    const rect = UNSAFE_queryAllByType(Rect)[0];
    expect(line.props.stroke).toBe("#abcdef");
    expect(rect.props.fill).toBe("#abcdef");
  });

  test("exposes a translateX shared value initialised from toolValue", () => {
    const ref = React.createRef();
    render(<Harness ref={ref} {...baseProps} />);
    // 80/130 * 500 ≈ 307.69
    expect(ref.current.translateX.value).toBeCloseTo((80 / 130) * 500, 1);
  });

  test("renders without crashing when isActive is false", () => {
    const { UNSAFE_queryAllByType } = render(
      <Harness {...baseProps} isActive={false} />,
    );
    expect(UNSAFE_queryAllByType(Line).length).toBeGreaterThanOrEqual(1);
  });

  test("handleToggle forwards the new active value to onActiveChange", () => {
    const onActiveChange = jest.fn();
    const ref = React.createRef();
    render(
      <Harness ref={ref} {...baseProps} onActiveChange={onActiveChange} />,
    );
    ref.current.handleToggle(true);
    expect(onActiveChange).toHaveBeenCalledWith(true);
  });
});
