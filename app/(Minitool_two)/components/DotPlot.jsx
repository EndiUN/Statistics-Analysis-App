import React, { useCallback, useMemo, useRef } from 'react';
import { View, Text } from 'react-native';
import Svg, { G, Circle, Line, Text as SvgText, Rect } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useDotPlotTools } from '../hooks/useDotPlotTools';
import {
  bucketCounts,
  computeScatterLevels,
  sortAscending,
} from '../lib/statistics';
import { GROUP_MODES, generateGuideValues } from '../lib/grouping';
import { createXScale, generateAxisTicks } from '../lib/scales';
import DotPlotControls from './DotPlotControls';
import { dotPlotStyles as s } from './styles';

const HORIZONTAL_PADDING = 10;
const HANDLE_SIZE = 12;
const COMBINED_COLORS = { before: 'blue', after: 'orange' };

/* -------------------------------------------------------------------------- */
/*  Single panel renderer (one chart instance — combined / before / after)    */
/* -------------------------------------------------------------------------- */

/**
 * Renders one SVG dot-plot panel. Heavy work (scale, scatter levels, guide
 * lines, ticks, gap counts) is memoised here — re-renders triggered purely
 * by drag updates only re-run the inexpensive inline JSX.
 */
const DotPlotPanel = React.memo(function DotPlotPanel({
  panelKey,
  isCombined,
  values, // raw numeric values for grouping/bucket calculations
  scatterPoints, // array of {value, type?} for rendering dots
  width,
  height,
  margins,
  dotRadius,
  axisColor,
  thresholdColor,
  xDomain,
  xAxisStep,
  groupMode,
  intervalWidth,
  fixedGroupSize,
  showData,
  thresholdLines,
  draggingLineId,
  valueToolEnabled,
  valueToolPos,
  chartName,
  panelLabel,
  // callbacks
  onAddLine,
  onMoveLine,
  onDragStart,
  onDragEnd,
  onValueToolMove,
}) {
  const innerWidth = width - margins.left - margins.right;
  const renderWidth = innerWidth - 2 * HORIZONTAL_PADDING;

  const xScale = useMemo(
    () => createXScale(xDomain, [0, renderWidth]),
    [xDomain, renderWidth],
  );

  const ticks = useMemo(
    () => generateAxisTicks(xScale, xAxisStep),
    [xScale, xAxisStep],
  );

  const scatter = useMemo(
    () => computeScatterLevels(scatterPoints, xScale, dotRadius),
    [scatterPoints, xScale, dotRadius],
  );

  // Guide lines come from grouping rules; threshold lines come from the user.
  // Both share rendering but only threshold lines are draggable.
  const guideLines = useMemo(() => {
    const guideValues = generateGuideValues(groupMode, values, {
      intervalWidth,
      fixedGroupSize,
    });
    return guideValues.map((v, i) => ({
      id: `guide-${panelKey}-${groupMode}-${i}`,
      x: xScale(v),
      isDraggable: false,
    }));
  }, [groupMode, values, intervalWidth, fixedGroupSize, xScale, panelKey]);

  const allLines = useMemo(
    () => [...guideLines, ...thresholdLines],
    [guideLines, thresholdLines],
  );

  const shouldShowGapCounts =
    groupMode !== GROUP_MODES.MEDIAN &&
    groupMode !== GROUP_MODES.QUARTILES &&
    groupMode !== GROUP_MODES.FIXED_GROUP_SIZE;

  // Counts in each gap between vertical lines (and between lines and edges).
  const gapCounts = useMemo(() => {
    if (!shouldShowGapCounts) return [];
    if (allLines.length === 0) return [];
    const xs = [...new Set(allLines.map((l) => l.x))].sort((a, b) => a - b);
    const boundariesX = [0, ...xs, renderWidth].filter(
      (v, i, arr) => arr.indexOf(v) === i,
    );
    const boundariesData = boundariesX.map((px) => xScale.invert(px));
    const counts = bucketCounts(values, boundariesData);
    return counts.map((count, idx) => ({
      count,
      midX: (boundariesX[idx] + boundariesX[idx + 1]) / 2,
    }));
  }, [allLines, values, renderWidth, shouldShowGapCounts, xScale]);

  // Dynamic height — grow if dots stack above the configured base height.
  const levelGap = dotRadius * 2 + 2;
  const maxLevel = scatter.reduce((m, d) => (d.level > m ? d.level : m), 1);
  const requiredHeight = maxLevel * levelGap + margins.top + margins.bottom;
  const currentHeight = Math.max(height, requiredHeight);
  const baseline = currentHeight - margins.bottom;
  const handleY = baseline + 17;

  // Tap to add line in custom mode. .runOnJS(true) keeps the callback on
  // the JS thread so React state updates (and JS-ref writes) are reliable
  // on Android.
  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .onEnd((event) => {
          if (groupMode !== GROUP_MODES.CUSTOM) return;
          const tapX = event.x - margins.left - HORIZONTAL_PADDING;
          const clamped = Math.max(0, Math.min(tapX, renderWidth));
          onAddLine(panelKey, clamped);
        }),
    [groupMode, margins.left, renderWidth, onAddLine, panelKey],
  );

  // Per-line drag uses a ref to capture the start position once.
  const dragStartRef = useRef(0);

  return (
    <View style={s.panel}>
      <Text style={s.panelTitle}>
        {chartName} - {panelLabel}
      </Text>
      <GestureDetector gesture={tapGesture}>
        <Svg width={width} height={currentHeight + margins.top + 20}>
          <G x={margins.left + HORIZONTAL_PADDING} y={margins.top}>
            {/* Axis */}
            <Line
              x1={0}
              y1={baseline}
              x2={renderWidth}
              y2={baseline}
              stroke={axisColor}
              strokeWidth={1}
            />

            {/* Ticks */}
            {ticks.map((tick, i) => (
              <G key={`tick-${i}`}>
                <Line
                  x1={xScale(tick)}
                  y1={baseline}
                  x2={xScale(tick)}
                  y2={baseline + 5}
                  stroke={axisColor}
                  strokeWidth={1}
                />
                <SvgText
                  x={xScale(tick)}
                  y={baseline + 15}
                  fontSize={10}
                  fill={axisColor}
                  textAnchor="middle"
                >
                  {Number.isInteger(tick) ? tick : tick.toFixed(1)}
                </SvgText>
              </G>
            ))}

            {/* Gap counts */}
            {gapCounts.map(
              (g, i) =>
                g.count > 0 && (
                  <SvgText
                    key={`count-${i}`}
                    x={g.midX}
                    y={margins.top - 15}
                    fontSize={12}
                    fill={axisColor}
                    textAnchor="middle"
                  >
                    {g.count}
                  </SvgText>
                ),
            )}

            {/* Dots */}
            {showData &&
              scatter.map((d, i) => (
                <Circle
                  key={`dot-${i}`}
                  cx={d.x}
                  cy={baseline - dotRadius - 2 - (d.level - 1) * levelGap}
                  r={dotRadius}
                  fill={
                    isCombined
                      ? COMBINED_COLORS[d.type] || thresholdColor
                      : COMBINED_COLORS[panelKey] || thresholdColor
                  }
                />
              ))}

            {/* Guide + threshold lines */}
            {allLines.map((line) => (
              <DraggableLine
                key={line.id}
                line={line}
                panelKey={panelKey}
                renderWidth={renderWidth}
                marginsTop={margins.top}
                baseline={baseline}
                handleY={handleY}
                color={thresholdColor}
                draggingLineId={draggingLineId}
                xScale={xScale}
                dragStartRef={dragStartRef}
                onMoveLine={onMoveLine}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}

            {/* Value tool */}
            {valueToolEnabled && valueToolPos != null && (
              <ValueToolMarker
                x={valueToolPos}
                panelKey={panelKey}
                renderWidth={renderWidth}
                marginsTop={margins.top}
                handleY={handleY}
                xScale={xScale}
                dragStartRef={dragStartRef}
                isDragging={draggingLineId === '__valueTool__'}
                onMove={onValueToolMove}
                onDragStart={() => onDragStart('__valueTool__')}
                onDragEnd={onDragEnd}
              />
            )}
          </G>
        </Svg>
      </GestureDetector>
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/*  Sub-renderers for draggable elements                                      */
/* -------------------------------------------------------------------------- */

const DraggableLine = React.memo(function DraggableLine({
  line,
  panelKey,
  renderWidth,
  marginsTop,
  baseline,
  handleY,
  color,
  draggingLineId,
  xScale,
  dragStartRef,
  onMoveLine,
  onDragStart,
  onDragEnd,
}) {
  const isDraggable = line.isDraggable;
  const gesture = useMemo(() => {
    if (!isDraggable) return Gesture.Tap(); // no-op
    // .runOnJS(true) is essential on Android: by default Pan callbacks are
    // worklets running on the UI thread, where mutating dragStartRef.current
    // silently no-ops and the line snaps to x=0 on the next update.
    return Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([0, 0])
      .onBegin(() => {
        dragStartRef.current = line.x;
        onDragStart(line.id);
      })
      .onUpdate((event) => {
        const x = Math.max(
          0,
          Math.min(dragStartRef.current + event.translationX, renderWidth),
        );
        onMoveLine(panelKey, line.id, x);
      })
      .onEnd(() => onDragEnd(panelKey));
  }, [
    isDraggable,
    line.id,
    line.x,
    renderWidth,
    panelKey,
    onDragStart,
    onMoveLine,
    onDragEnd,
    dragStartRef,
  ]);

  const lineY2 = isDraggable ? handleY + HANDLE_SIZE : baseline;
  return (
    <G>
      <Line
        x1={line.x}
        y1={marginsTop - 10}
        x2={line.x}
        y2={lineY2}
        stroke={color}
        strokeWidth={isDraggable ? 2 : 1.5}
        strokeDasharray={isDraggable ? undefined : '3,3'}
      />
      {isDraggable && (
        <GestureDetector gesture={gesture}>
          <Rect
            x={line.x - HANDLE_SIZE / 2}
            y={handleY}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill={draggingLineId === line.id ? 'orange' : color}
            stroke="black"
            strokeWidth={1}
            rx={2}
            ry={2}
          />
        </GestureDetector>
      )}
      <SvgText
        x={line.x + 4}
        y={marginsTop - 2}
        fontSize={10}
        fill={color}
        textAnchor="start"
      >
        {xScale.invert(line.x).toFixed(1)}
      </SvgText>
    </G>
  );
});

const ValueToolMarker = React.memo(function ValueToolMarker({
  x,
  panelKey,
  renderWidth,
  marginsTop,
  handleY,
  xScale,
  dragStartRef,
  isDragging,
  onMove,
  onDragStart,
  onDragEnd,
}) {
  // Keep a ref that always holds the latest pixel-x so the gesture's
  // onBegin (which is NOT recreated on every x change) reads the
  // up-to-date position instead of a stale closure value.
  const latestXRef = useRef(x);
  latestXRef.current = x;

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([0, 0])
        .onBegin(() => {
          dragStartRef.current = latestXRef.current;
          onDragStart?.();
        })
        .onUpdate((event) => {
          const nx = Math.max(
            0,
            Math.min(dragStartRef.current + event.translationX, renderWidth),
          );
          onMove(panelKey, nx);
        })
        .onEnd(() => onDragEnd?.(panelKey)),
    [renderWidth, panelKey, onMove, onDragStart, onDragEnd, dragStartRef],
  );

  return (
    <G>
      <Line
        x1={x}
        y1={marginsTop - 10}
        x2={x}
        y2={handleY + HANDLE_SIZE}
        stroke="red"
        strokeWidth={2}
      />
      <GestureDetector gesture={gesture}>
        <Rect
          x={x - HANDLE_SIZE / 2}
          y={handleY}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill={isDragging ? 'orange' : 'red'}
          stroke="black"
          strokeWidth={1}
          rx={2}
          ry={2}
        />
      </GestureDetector>
      <SvgText
        x={x + 4}
        y={marginsTop - 2}
        fontSize={10}
        fill="red"
        textAnchor="start"
      >
        {xScale.invert(x).toFixed(1)}
      </SvgText>
    </G>
  );
});

/* -------------------------------------------------------------------------- */
/*  Smart container                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Configuration-driven dot-plot for two-sample comparison.
 *
 * Props:
 *   data: { before:number[], after:number[] }
 *   settings: shape of CHART_DEFAULTS (width, height, margins, dotRadius,
 *             xDomain, xAxisStep, chartName, ...)
 *
 * State for the interactive tools is owned by useDotPlotTools so the chart
 * itself can rely on stable callbacks and memoised derived data.
 */
function DotPlot({ data, settings, tools: externalTools }) {
  // Allow the page to lift the tools hook (so it can drive a page-level
  // Clear-All-Lines button); fall back to an internally-owned hook for
  // standalone usage.
  const internalTools = useDotPlotTools({
    initialIntervalWidth: settings.initialIntervalWidth,
  });
  const tools = externalTools ?? internalTools;
  const { state, actions } = tools;

  // Memoise raw arrays so derived useMemo deps are referentially stable.
  const beforeValues = useMemo(() => data.before ?? [], [data.before]);
  const afterValues = useMemo(() => data.after ?? [], [data.after]);
  const combinedValues = useMemo(
    () => [...beforeValues, ...afterValues],
    [beforeValues, afterValues],
  );

  // Pre-sorted copies are passed downstream where useful.
  const combinedScatterPoints = useMemo(
    () => [
      ...beforeValues.map((v) => ({ value: v, type: 'before' })),
      ...afterValues.map((v) => ({ value: v, type: 'after' })),
    ],
    [beforeValues, afterValues],
  );
  const beforeScatterPoints = useMemo(
    () => beforeValues.map((v) => ({ value: v })),
    [beforeValues],
  );
  const afterScatterPoints = useMemo(
    () => afterValues.map((v) => ({ value: v })),
    [afterValues],
  );

  // When the value tool is toggled on, centre it.
  const handleToggleValueTool = useCallback(
    (value) => {
      const innerChartWidth =
        settings.width - settings.margins.left - settings.margins.right - 2 * HORIZONTAL_PADDING;
      actions.setValueToolEnabled(value, innerChartWidth / 2);
    },
    [actions, settings.width, settings.margins.left, settings.margins.right],
  );

  // Wrap actions to inject the value-tool toggle override.
  const wrappedActions = useMemo(
    () => ({ ...actions, setValueToolEnabled: handleToggleValueTool }),
    [actions, handleToggleValueTool],
  );

  // Common props each panel needs.
  const panelDefaults = {
    width: settings.width,
    height: settings.height,
    margins: settings.margins,
    dotRadius: settings.dotRadius,
    axisColor: settings.axisColor,
    thresholdColor: settings.thresholdColor,
    xDomain: settings.xDomain,
    xAxisStep: settings.xAxisStep,
    groupMode: state.groupMode,
    intervalWidth: state.intervalWidth,
    fixedGroupSize: state.fixedGroupSize,
    showData: state.showData,
    draggingLineId: state.draggingLineId,
    valueToolEnabled: state.valueToolEnabled,
    chartName: settings.chartName,
    onAddLine: actions.addLine,
    onMoveLine: actions.moveLine,
    onDragStart: actions.startDrag,
    onDragEnd: actions.endDrag,
    onValueToolMove: actions.setValueToolPos,
  };

  // sortAscending is currently used only for fixed-group-size; calling it
  // up-front here would be wasted work for other modes, so we let the lib
  // handle it lazily inside generateGuideValues.
  void sortAscending;

  return (
    <Animated.View style={s.wrapper}>
      <View style={s.chartsContainer}>
        {state.splitCharts ? (
          <>
            <DotPlotPanel
              {...panelDefaults}
              panelKey="before"
              panelLabel="Before"
              isCombined={false}
              values={beforeValues}
              scatterPoints={beforeScatterPoints}
              thresholdLines={state.thresholdLines.before}
              valueToolPos={state.valueToolPos.before}
            />
            <DotPlotPanel
              {...panelDefaults}
              panelKey="after"
              panelLabel="After"
              isCombined={false}
              values={afterValues}
              scatterPoints={afterScatterPoints}
              thresholdLines={state.thresholdLines.after}
              valueToolPos={state.valueToolPos.after}
            />
          </>
        ) : (
          <DotPlotPanel
            {...panelDefaults}
            panelKey="combined"
            panelLabel="Combined"
            isCombined
            values={combinedValues}
            scatterPoints={combinedScatterPoints}
            thresholdLines={state.thresholdLines.combined}
            valueToolPos={state.valueToolPos.combined}
          />
        )}
      </View>

      <DotPlotControls state={state} actions={wrappedActions} />
    </Animated.View>
  );
}

export default React.memo(DotPlot);
