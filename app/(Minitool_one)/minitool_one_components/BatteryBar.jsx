import React, { useState, useRef } from "react";
import { Rect, Circle, G } from "react-native-svg";
import Animated, {
  useAnimatedReaction,
  runOnJS,
} from "react-native-reanimated";
import {
  TOUGH_CELL_COLOR,
  ALWAYS_READY_COLOR,
  DOT_COLOR,
  RANGE_HIGHLIGHT_COLOR,
} from "../constants";

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const BAR_HEIGHT = 8;
const BAR_SPACING = 7;

const BatteryBar = ({
  item,
  index,
  chartWidth,
  rangeStartX,
  rangeEndX,
  tool,
  dotsOnly,
  onBarPress,
  TOP_BUFFER,
  MAX_LIFESPAN,
}) => {
  const yPos = index * (BAR_HEIGHT + BAR_SPACING);
  const originalColor =
    item.brand === "Tough Cell" ? TOUGH_CELL_COLOR : ALWAYS_READY_COLOR;
  const barEndPosition = (item.lifespan / MAX_LIFESPAN) * chartWidth;

  const [barColor, setBarColor] = useState(originalColor);
  const wasHighlightedRef = useRef(false);

  // Only call runOnJS when highlight state actually changes (not every frame)
  useAnimatedReaction(
    () => {
      if (!tool) return false;
      return (
        barEndPosition >= rangeStartX.value && barEndPosition <= rangeEndX.value
      );
    },
    (isHighlighted, prevHighlighted) => {
      if (isHighlighted !== prevHighlighted) {
        runOnJS(setBarColor)(
          isHighlighted ? RANGE_HIGHLIGHT_COLOR : originalColor,
        );
      }
    },
    [barEndPosition, originalColor, tool],
  );

  const handlePress = () => {
    if (onBarPress) {
      onBarPress(index, item);
    }
  };

  return (
    <G>
      {!dotsOnly && (
        <AnimatedRect
          testID={`battery-bar-${index}`}
          x="0"
          y={yPos + TOP_BUFFER}
          width={barEndPosition}
          height={BAR_HEIGHT}
          fill={barColor}
          onPress={handlePress}
        />
      )}
      <Circle
        cx={barEndPosition}
        cy={yPos + BAR_HEIGHT / 2 + TOP_BUFFER}
        r="4"
        fill={DOT_COLOR}
      />
    </G>
  );
};

export default BatteryBar;
