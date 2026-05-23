import React, { useCallback, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Line,
  Text as SvgText,
  G,
  Rect,
  Polygon,
} from "react-native-svg";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import { scaleLinear } from "d3-scale";
import useStatistics from "./useStatistics";
import useDimensions from "../../hooks/useDimensions";

const ScatterPlot = ({
  data = [],
  width: widthProp,
  height: heightProp,
  showCross = false,
  hideData = false,
  activeGrid = null,
  twoGroupsCount = null,
  fourGroupsCount = null,
  // Multi-select: array of selected point indices. Parent owns the state and
  // toggles entries via onPointToggle (kept compatible with single-select
  // callers by passing `[idx]` / `[]`).
  selectedPoints = [],
  onPointToggle,
  onScrollEnabled,
  isMobile = false,
}) => {
  const { width: windowWidth } = useDimensions();
  const containerWidth = widthProp ?? windowWidth;

  // ── Chart geometry constants ──────────────────────────────
  const isCompact = containerWidth < 600;
  const CHART_WIDTH = Math.max(300, containerWidth - (isCompact ? 20 : 40));
  const CHART_HEIGHT = isMobile ? CHART_WIDTH * 1.3 : CHART_WIDTH * 0.75; // 4:3 aspect ratio, good for data distribution and mobile screens.
  const PADDING = isCompact ? 12 : 40;
  const Y_AXIS_LABEL_WIDTH = isCompact ? 18 : 22;
  const X_AXIS_LABEL_HEIGHT = isCompact ? 18 : 22;
  const Y_AXIS_WIDTH = (isCompact ? 32 : 50) + Y_AXIS_LABEL_WIDTH;
  const X_AXIS_HEIGHT = (isCompact ? 32 : 40) + X_AXIS_LABEL_HEIGHT;
  const PLOT_LEFT = Y_AXIS_WIDTH + PADDING;
  const PLOT_RIGHT = CHART_WIDTH - PADDING;
  const PLOT_TOP = PADDING;
  const PLOT_BOTTOM = CHART_HEIGHT - X_AXIS_HEIGHT - PADDING;

  // Size of the invisible square overlay that captures cross-handle drags.
  // Large enough to grab comfortably with a finger, small enough that it
  // doesn't swallow taps on nearby data points.
  const CROSS_HIT_SIZE = 56;

  // Fast membership lookup for multi-selection.
  const selectedSet = useMemo(() => new Set(selectedPoints), [selectedPoints]);

  // ── Scales (memoised) ────────────────────────────────────────
  const { xScale, yScale, xDomain, yDomain, xTickValues, yTickValues } =
    useMemo(() => {
      const xVals = data.map((d) => d.x);
      const yVals = data.map((d) => d.y);
      const _minX = Math.min(...xVals);
      const _maxX = Math.max(...xVals);
      const _minY = Math.min(...yVals);
      const _maxY = Math.max(...yVals);
      const xPad = (_maxX - _minX) * 0.1;
      const yPad = (_maxY - _minY) * 0.1;
      const _xDomain = [_minX - xPad, _maxX + xPad];
      const _yDomain = [_minY - yPad, _maxY + yPad];

      const _xScale = scaleLinear()
        .domain(_xDomain)
        .range([PLOT_LEFT, PLOT_RIGHT]);
      const _yScale = scaleLinear()
        .domain(_yDomain)
        .range([PLOT_BOTTOM, PLOT_TOP]);

      const xTicks = 6;
      const yTicks = 6;
      const _xTickValues = Array.from(
        { length: xTicks },
        (_, i) =>
          _xDomain[0] + (i * (_xDomain[1] - _xDomain[0])) / (xTicks - 1),
      );
      const _yTickValues = Array.from(
        { length: yTicks },
        (_, i) =>
          _yDomain[0] + (i * (_yDomain[1] - _yDomain[0])) / (yTicks - 1),
      );

      return {
        xScale: _xScale,
        yScale: _yScale,
        xDomain: _xDomain,
        yDomain: _yDomain,
        xTickValues: _xTickValues,
        yTickValues: _yTickValues,
      };
    }, [data, PLOT_LEFT, PLOT_RIGHT, PLOT_TOP, PLOT_BOTTOM]);

  // ── Cross (draggable) state ───────────────────────────────────
  const midDataX = (xDomain[0] + xDomain[1]) / 2;
  const midDataY = (yDomain[0] + yDomain[1]) / 2;
  const [crossCenter, setCrossCenter] = useState({ x: midDataX, y: midDataY });
  // Keep the cross centred when domain changes (dataset switch).
  // Calling setCrossCenter during render is safe in React 18+ when guarded
  // by a condition — React restarts the render with the new state. The
  // previous code directly mutated crossCenter.x/y which is illegal and
  // could cause "Rendered fewer hooks than expected" errors.
  const prevDomainRef = useRef(null);
  const domainKey = `${xDomain[0]},${xDomain[1]},${yDomain[0]},${yDomain[1]}`;
  if (prevDomainRef.current !== domainKey) {
    prevDomainRef.current = domainKey;
    setCrossCenter({ x: midDataX, y: midDataY });
  }

  const crossStartRef = useRef({ x: 0, y: 0 });

  // .runOnJS(true) is critical on Android: without it, .onBegin/.onUpdate
  // are worklets on the UI thread where mutating `crossStartRef.current`
  // silently no-ops AND calling React's `setCrossCenter` from the wrong
  // thread crashes the app. Forcing the JS thread makes both safe.
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin(() => {
          crossStartRef.current = { x: crossCenter.x, y: crossCenter.y };
          onScrollEnabled?.(false);
        })
        .onUpdate((e) => {
          const dataX =
            crossStartRef.current.x +
            e.translationX /
              ((PLOT_RIGHT - PLOT_LEFT) / (xDomain[1] - xDomain[0]));
          const dataY =
            crossStartRef.current.y -
            e.translationY /
              ((PLOT_BOTTOM - PLOT_TOP) / (yDomain[1] - yDomain[0]));
          const cx = Math.max(xDomain[0], Math.min(xDomain[1], dataX));
          const cy = Math.max(yDomain[0], Math.min(yDomain[1], dataY));
          setCrossCenter({ x: cx, y: cy });
        })
        .onEnd(() => onScrollEnabled?.(true)),
    [
      crossCenter.x,
      crossCenter.y,
      xDomain,
      yDomain,
      PLOT_RIGHT,
      PLOT_LEFT,
      PLOT_BOTTOM,
      PLOT_TOP,
      onScrollEnabled,
    ],
  );

  // ── Statistics hook ───────────────────────────────────────────
  const { gridData, quadrantCounts, twoGroupSlices, fourGroupSlices } =
    useStatistics({
      data,
      activeGrid,
      twoGroupsCount,
      fourGroupsCount,
      crossCenter: showCross ? crossCenter : null,
      xDomain,
      yDomain,
    });

  // ── Tap to (de)select a point ─────────────────────────────────
  const handlePointTap = useCallback(
    (index) => {
      onPointToggle?.(index);
    },
    [onPointToggle],
  );

  // ── SVG layer: grid overlay ───────────────────────────────────
  const renderGridOverlay = () => {
    if (!gridData) return null;
    const { counts, xStep, yStep } = gridData;
    const elements = [];
    const gridSize = counts.length;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x1 = xScale(xDomain[0] + col * xStep);
        const y1 = yScale(yDomain[1] - row * yStep);
        const x2 = xScale(xDomain[0] + (col + 1) * xStep);
        const y2 = yScale(yDomain[1] - (row + 1) * yStep);
        const cellW = x2 - x1;
        const cellH = y2 - y1;

        elements.push(
          <G key={`grid-${row}-${col}`}>
            <Rect
              x={x1}
              y={y1}
              width={cellW}
              height={cellH}
              fill="transparent"
              stroke="#94a3b8"
              strokeWidth="1"
            />
            <SvgText
              x={x1 + cellW / 2}
              y={y1 + cellH / 2 + 5}
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
              fill="#334155"
            >
              {counts[row][col]}
            </SvgText>
          </G>,
        );
      }
    }
    return <G>{elements}</G>;
  };

  // ── SVG layer: cross (quadrant) overlay ───────────────────────
  const crossPixelCenter = useMemo(() => {
    if (!showCross) return null;
    return { cx: xScale(crossCenter.x), cy: yScale(crossCenter.y) };
  }, [showCross, crossCenter.x, crossCenter.y, xScale, yScale]);

  const renderCrossOverlay = () => {
    if (!showCross || !crossPixelCenter) return null;
    const { cx, cy } = crossPixelCenter;
    const counts = quadrantCounts || [0, 0, 0, 0];

    return (
      <G>
        <Line
          x1={cx}
          y1={PLOT_TOP}
          x2={cx}
          y2={PLOT_BOTTOM}
          stroke="#dc2626"
          strokeWidth="2"
          strokeDasharray="6,3"
        />
        <Line
          x1={PLOT_LEFT}
          y1={cy}
          x2={PLOT_RIGHT}
          y2={cy}
          stroke="#dc2626"
          strokeWidth="2"
          strokeDasharray="6,3"
        />
        {/* Center handle (visual). The drag gesture is on an overlay View. */}
        <Circle cx={cx} cy={cy} r="10" fill="#dc2626" opacity="0.85" />
        <Circle cx={cx} cy={cy} r="3" fill="#fff" />

        <SvgText
          x={PLOT_LEFT + 10}
          y={PLOT_TOP + 18}
          fontSize="14"
          fontWeight="bold"
          fill="#dc2626"
        >
          {counts[0]}
        </SvgText>
        <SvgText
          x={PLOT_RIGHT - 10}
          y={PLOT_TOP + 18}
          fontSize="14"
          fontWeight="bold"
          fill="#dc2626"
          textAnchor="end"
        >
          {counts[1]}
        </SvgText>
        <SvgText
          x={PLOT_LEFT + 10}
          y={PLOT_BOTTOM - 8}
          fontSize="14"
          fontWeight="bold"
          fill="#dc2626"
        >
          {counts[2]}
        </SvgText>
        <SvgText
          x={PLOT_RIGHT - 10}
          y={PLOT_BOTTOM - 8}
          fontSize="14"
          fontWeight="bold"
          fill="#dc2626"
          textAnchor="end"
        >
          {counts[3]}
        </SvgText>
      </G>
    );
  };

  // ── Box-style overlay used by both 2-group and 4-group modes ──
  // Renders a translucent box from `low` → `high` with a bold median line.
  // For 4-group mode we additionally darken/inset a Q1→Q3 inner box so the
  // only visual difference between modes is *how many* boxes appear.
  const renderBoxSlice = (key, s, color, fillColor, withQuartiles) => {
    if (s.count === 0) return null;
    const x1 = xScale(s.xLo);
    const x2 = xScale(s.xHi);
    const inset = (x2 - x1) * 0.15;
    const bx1 = x1 + inset;
    const bx2 = x2 - inset;
    const lowY = yScale(s.low);
    const highY = yScale(s.high);
    const medY = yScale(s.median);

    const innerBox = withQuartiles && s.q1 != null && s.q3 != null;
    const q1Y = innerBox ? yScale(s.q1) : null;
    const q3Y = innerBox ? yScale(s.q3) : null;

    return (
      <G key={key}>
        {/* Outer filled box: low → high */}
        <Rect
          x={bx1}
          y={highY}
          width={bx2 - bx1}
          height={lowY - highY}
          fill={fillColor}
          stroke={color}
          strokeWidth="1.5"
          rx="2"
        />
        {/* Inner Q1→Q3 box, only in 4-group mode */}
        {innerBox && (
          <Rect
            x={bx1}
            y={q3Y}
            width={bx2 - bx1}
            height={q1Y - q3Y}
            fill={color}
            fillOpacity={0.18}
            stroke={color}
            strokeWidth="1.5"
            rx="2"
          />
        )}
        {/* Median */}
        <Line
          x1={bx1}
          y1={medY}
          x2={bx2}
          y2={medY}
          stroke={color}
          strokeWidth="2.5"
        />
      </G>
    );
  };

  const renderSliceBoundary = (key, s, i, color) =>
    i === 0 ? null : (
      <Line
        key={key}
        x1={xScale(s.xLo)}
        y1={PLOT_TOP}
        x2={xScale(s.xLo)}
        y2={PLOT_BOTTOM}
        stroke={color}
        strokeWidth="1"
        strokeDasharray="4,3"
      />
    );

  // ── SVG layer: two-group slicing ──────────────────────────────
  const renderTwoGroupsOverlay = () => {
    if (!twoGroupSlices) return null;
    const color = "#0891b2";
    const fillColor = "rgba(8,145,178,0.18)";
    return (
      <G>
        {twoGroupSlices.map((s, i) =>
          renderSliceBoundary(`two-boundary-${i}`, s, i, color),
        )}
        {twoGroupSlices.map((s, i) =>
          renderBoxSlice(`two-box-${i}`, s, color, fillColor, false),
        )}
      </G>
    );
  };

  // ── SVG layer: four-group slicing ─────────────────────────────
  const renderFourGroupsOverlay = () => {
    if (!fourGroupSlices) return null;
    const color = "#0891b2";
    const fillColor = "rgba(8,145,178,0.12)";
    return (
      <G>
        {fourGroupSlices.map((s, i) =>
          renderSliceBoundary(`four-boundary-${i}`, s, i, color),
        )}
        {fourGroupSlices.map((s, i) =>
          renderBoxSlice(`four-box-${i}`, s, color, fillColor, true),
        )}
      </G>
    );
  };

  // ── SVG layer: selected-point projection lines ────────────────
  // Lines go from the dot down to the X-axis and left to the Y-axis.
  // Small triangles sit on the axes where the lines meet them.
  const TRIANGLE_SIZE = 6;
  const renderSelectedPointOverlay = () => {
    if (selectedPoints.length === 0) return null;
    return (
      <G>
        {selectedPoints.map((idx) => {
          const pt = data[idx];
          if (!pt) return null;
          const cx = xScale(pt.x);
          const cy = yScale(pt.y);
          return (
            <G key={`sel-${idx}`}>
              {/* Vertical line: dot → X-axis. Extend to the actual axis
                  line (CHART_HEIGHT - X_AXIS_HEIGHT), not just PLOT_BOTTOM
                  which stops PADDING pixels short of the axis. */}
              <Line
                x1={cx}
                y1={cy}
                x2={cx}
                y2={CHART_HEIGHT - X_AXIS_HEIGHT}
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              {/* Horizontal line: dot → Y-axis. Extend to Y_AXIS_WIDTH, the
                  actual axis x-coordinate, not PLOT_LEFT which is PADDING
                  pixels to the right of the axis. */}
              <Line
                x1={cx}
                y1={cy}
                x2={Y_AXIS_WIDTH}
                y2={cy}
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="3,3"
              />
              {/* Triangle on X-axis: sits below the axis (outside the plot),
                  tip pointing up and touching the axis — like a ▲ marker */}
              <Polygon
                points={`${cx - TRIANGLE_SIZE},${CHART_HEIGHT - X_AXIS_HEIGHT + TRIANGLE_SIZE} ${cx + TRIANGLE_SIZE},${CHART_HEIGHT - X_AXIS_HEIGHT + TRIANGLE_SIZE} ${cx},${CHART_HEIGHT - X_AXIS_HEIGHT}`}
                fill="#f59e0b"
              />
              {/* Triangle on Y-axis: sits to the left of the axis (outside the
                  plot), tip pointing right and touching the axis — ▶ marker */}
              <Polygon
                points={`${Y_AXIS_WIDTH - TRIANGLE_SIZE},${cy - TRIANGLE_SIZE} ${Y_AXIS_WIDTH - TRIANGLE_SIZE},${cy + TRIANGLE_SIZE} ${Y_AXIS_WIDTH},${cy}`}
                fill="#f59e0b"
              />
              {/* Visible selection ring */}
              <Circle
                cx={cx}
                cy={cy}
                r="6"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
              />
            </G>
          );
        })}
      </G>
    );
  };

  // ── Main render ───────────────────────────────────────────────
  return (
    <View
      style={{
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 10,
      }}
    >
      {/* Inner wrapper is exactly the SVG size so `position: "absolute"`
          on the cross-handle overlay uses the same coordinate origin as
          the SVG — fixes the handle being offset to the left when the
          outer View is wider than CHART_WIDTH and centers the SVG. */}
      <View
        style={{
          position: "relative",
          width: CHART_WIDTH,
          height: CHART_HEIGHT,
        }}
      >
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Background grid lines & Y-axis ticks */}
          {yTickValues.map((tickValue, i) => {
            const y = yScale(tickValue);
            return (
              <G key={`y-tick-${i}`}>
                <Line
                  x1={Y_AXIS_WIDTH}
                  y1={y}
                  x2={CHART_WIDTH}
                  y2={y}
                  stroke="#e0e0e0"
                  strokeWidth="1"
                />
                <SvgText
                  x={Y_AXIS_WIDTH - 10}
                  y={y + 4}
                  fontSize="11"
                  textAnchor="end"
                  fill="#666"
                >
                  {Math.round(tickValue)}
                </SvgText>
              </G>
            );
          })}

          {/* X-axis ticks */}
          {xTickValues.map((tickValue, i) => {
            const x = xScale(tickValue);
            return (
              <G key={`x-tick-${i}`}>
                <Line
                  x1={x}
                  y1={PADDING}
                  x2={x}
                  y2={CHART_HEIGHT - X_AXIS_HEIGHT}
                  stroke="#e0e0e0"
                  strokeWidth="1"
                />
                <SvgText
                  x={x}
                  y={CHART_HEIGHT - X_AXIS_HEIGHT + 20}
                  fontSize="11"
                  textAnchor="middle"
                  fill="#666"
                >
                  {Math.round(tickValue)}
                </SvgText>
              </G>
            );
          })}

          {/* Axes */}
          <Line
            x1={Y_AXIS_WIDTH}
            y1={PADDING}
            x2={Y_AXIS_WIDTH}
            y2={CHART_HEIGHT - X_AXIS_HEIGHT}
            stroke="#333"
            strokeWidth="2"
          />
          <Line
            x1={Y_AXIS_WIDTH}
            y1={CHART_HEIGHT - X_AXIS_HEIGHT}
            x2={CHART_WIDTH}
            y2={CHART_HEIGHT - X_AXIS_HEIGHT}
            stroke="#333"
            strokeWidth="2"
          />

          {/* Overlays (behind dots so taps register) */}
          {renderGridOverlay()}
          {renderTwoGroupsOverlay()}
          {renderFourGroupsOverlay()}
          {renderCrossOverlay()}

          {/* Data points — selected dots get a larger invisible hit circle
            so they're easy to tap again for deselection on touch devices. */}
          {data.map((point, index) => {
            const cx = xScale(point.x);
            const cy = yScale(point.y);
            const isSelected = selectedSet.has(index);
            return (
              <G key={`point-${index}`}>
                {/* Invisible expanded hit area (always present, bigger for
                  selected dots to make deselection comfortable) */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 20 : 12}
                  fill="transparent"
                  onPress={() => handlePointTap(index)}
                />
                {/* Visible dot */}
                <Circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 6 : 4}
                  fill={isSelected ? "#f59e0b" : "#2563eb"}
                  opacity={hideData ? 0 : 0.7}
                  onPress={() => handlePointTap(index)}
                />
              </G>
            );
          })}

          {/* Projection lines for selected points (on top of everything) */}
          {renderSelectedPointOverlay()}

          {/* Axis labels */}
          <SvgText
            x={12}
            y={(PLOT_TOP + PLOT_BOTTOM) / 2}
            fontSize="13"
            textAnchor="middle"
            fill="#333"
            transform={`rotate(-90 12 ${(PLOT_TOP + PLOT_BOTTOM) / 2})`}
          >
            Y Variable
          </SvgText>
          <SvgText
            x={(PLOT_LEFT + PLOT_RIGHT) / 2}
            y={CHART_HEIGHT - 6}
            fontSize="13"
            textAnchor="middle"
            fill="#333"
          >
            X Variable
          </SvgText>
        </Svg>

        {/* Drag-handle overlay: only the small square at the cross center is
          draggable, so panning anywhere else on the chart no longer steals
          taps from data points (fixes inability to deselect on Android). */}
        {showCross && crossPixelCenter && (
          <GestureDetector gesture={panGesture}>
            <View
              style={{
                position: "absolute",
                left: crossPixelCenter.cx - CROSS_HIT_SIZE / 2,
                top: crossPixelCenter.cy - CROSS_HIT_SIZE / 2,
                width: CROSS_HIT_SIZE,
                height: CROSS_HIT_SIZE,
                // Transparent — purely a hit target.
                backgroundColor: "transparent",
              }}
            />
          </GestureDetector>
        )}
      </View>
    </View>
  );
};

export default ScatterPlot;
