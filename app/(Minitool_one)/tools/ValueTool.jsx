import React, { useCallback } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useAnimatedReaction,
  runOnJS,
  clamp,
  withTiming,
} from "react-native-reanimated";
import { Rect, Line, G } from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedLine = Animated.createAnimatedComponent(Line);

/**
 * ValueTool Hook
 * Encapsulates all value tool logic and returns the rendered component
 * Returns an object with the rendered component and control functions
 */
const useValueTool = ({
  isActive,
  onActiveChange,
  onValueChange,
  chartWidth,
  chartHeight,
  maxLifespan = 130,
  toolValue = 80.0,
  toolColor = "red",
  X_AXIS_HEIGHT,
  TOP_BUFFER,
}) => {
  // --- Value Tool Gesture Logic ---
  const initialTranslateX = (toolValue / maxLifespan) * chartWidth;
  const translateX = useSharedValue(initialTranslateX);
  const context = useSharedValue({ x: 0 });

  // --- Sync translateX with toolValue when it changes externally ---
  useAnimatedReaction(
    () => toolValue,
    (currentToolValue) => {
      const newTranslateX = (currentToolValue / maxLifespan) * chartWidth;
      translateX.value = newTranslateX;
    },
    [maxLifespan, chartWidth],
  );

  const panGesture = Gesture.Pan()
    .activeOffsetX([0, 0])
    .onBegin(() => {
      context.value = { x: translateX.value };
    })
    .onUpdate((event) => {
      translateX.value = clamp(
        event.translationX + context.value.x,
        0,
        chartWidth,
      );
    });

  // --- Animated Props for line and handle ---
  const animatedToolProps = useAnimatedProps(() => ({
    x: translateX.value - 7.5,
  }));

  const animatedValueLineProps = useAnimatedProps(() => ({
    x1: translateX.value,
    x2: translateX.value,
  }));

  // --- Animation for label ---
  const animatedLabelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: withTiming(isActive ? 1 : 0),
  }));

  // --- Animation for tool visibility ---
  const valueToolContainerAnimatedProps = useAnimatedProps(() => {
    return { opacity: withTiming(isActive ? 1 : 0) };
  });

  // --- Function to handle value updates ---
  useAnimatedReaction(
    () => translateX.value,
    (currentValue) => {
      const newValue = (currentValue / chartWidth) * maxLifespan;
      runOnJS(onValueChange)(newValue);
    },
    [chartWidth, maxLifespan],
  );

  const handleToggle = useCallback(
    (newValue) => {
      onActiveChange(newValue);
    },
    [onActiveChange],
  );

  // --- Render component ---
  const renderValueTool = () => (
    <AnimatedG animatedProps={valueToolContainerAnimatedProps}>
      <AnimatedLine
        y1={TOP_BUFFER}
        y2={chartHeight + X_AXIS_HEIGHT + TOP_BUFFER + 15}
        stroke={toolColor}
        strokeWidth="2"
        animatedProps={animatedValueLineProps}
      />
      <GestureDetector gesture={panGesture}>
        <AnimatedRect
          y={chartHeight + X_AXIS_HEIGHT + TOP_BUFFER + 15}
          height="15"
          width="15"
          fill={toolColor}
          animatedProps={animatedToolProps}
        />
      </GestureDetector>
    </AnimatedG>
  );

  return {
    // Rendered component
    renderValueTool,

    // Shared values and gestures (exposed if needed for advanced usage)
    translateX,
    panGesture,

    // Animated props (exposed if needed)
    animatedToolProps,
    animatedValueLineProps,
    animatedLabelStyle,
    valueToolContainerAnimatedProps,

    // Handlers
    handleToggle,
  };
};

export default useValueTool;
