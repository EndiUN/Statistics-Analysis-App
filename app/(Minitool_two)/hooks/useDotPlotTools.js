/**
 * Reducer-driven state container for all interactive tools on a DotPlot:
 *  - group mode + numeric parameters (interval width, fixed group size)
 *  - split-charts toggle, show-data toggle
 *  - threshold (custom) lines per panel
 *  - value tool position per panel
 *  - currently dragging line id
 *
 * Lives outside the chart so the chart itself can stay pure / memoizable.
 * All callbacks returned by this hook are stable across renders.
 */

import { useCallback, useMemo, useReducer } from 'react';
import { GROUP_MODES } from '../lib/grouping';

const PANELS = ['combined', 'before', 'after'];

/**
 * Generate a stable, collision-free identifier for interactive objects
 * (custom threshold lines). Uses native crypto.randomUUID() when available
 * and falls back to a Math.random-based string for older runtimes.
 */
const makeId = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}-${Math.random()
    .toString(36)
    .slice(2)}`;
};

const emptyPerPanel = (factory) =>
  PANELS.reduce((acc, key) => {
    acc[key] = factory();
    return acc;
  }, {});

const initialState = (initialIntervalWidth) => ({
  groupMode: GROUP_MODES.NONE,
  intervalWidth: initialIntervalWidth,
  intervalWidthInput: String(initialIntervalWidth),
  fixedGroupSize: 5,
  fixedGroupSizeInput: '5',
  splitCharts: false,
  showData: true,
  valueToolEnabled: false,
  thresholdLines: emptyPerPanel(() => []),
  valueToolPos: emptyPerPanel(() => null),
  draggingLineId: null,
});

// --- Action types ----------------------------------------------------------
const A = {
  SET_GROUP_MODE: 'SET_GROUP_MODE',
  SET_INTERVAL_WIDTH: 'SET_INTERVAL_WIDTH',
  SET_FIXED_GROUP_SIZE: 'SET_FIXED_GROUP_SIZE',
  TOGGLE_SPLIT: 'TOGGLE_SPLIT',
  TOGGLE_SHOW_DATA: 'TOGGLE_SHOW_DATA',
  TOGGLE_VALUE_TOOL: 'TOGGLE_VALUE_TOOL',
  SET_VALUE_TOOL_POS: 'SET_VALUE_TOOL_POS',
  ADD_LINE: 'ADD_LINE',
  MOVE_LINE: 'MOVE_LINE',
  DRAG_START: 'DRAG_START',
  DRAG_END: 'DRAG_END',
  CLEAR_LINES: 'CLEAR_LINES',
  RESET_CUSTOM_LINES: 'RESET_CUSTOM_LINES',
};

const reducer = (state, action) => {
  switch (action.type) {
    case A.SET_GROUP_MODE:
      // Custom user-drawn lines belong to a particular grouping context;
      // any change of mode invalidates them. Folding this consequence into
      // the reducer (instead of a useEffect) makes the transition atomic
      // and avoids an extra render cycle after the mode switch.
      return {
        ...state,
        groupMode: action.mode,
        thresholdLines: emptyPerPanel(() => []),
      };

    case A.SET_INTERVAL_WIDTH:
      return {
        ...state,
        intervalWidthInput: action.text,
        intervalWidth: action.numeric ?? state.intervalWidth,
      };

    case A.SET_FIXED_GROUP_SIZE:
      return {
        ...state,
        fixedGroupSizeInput: action.text,
        fixedGroupSize: action.numeric ?? state.fixedGroupSize,
      };

    case A.TOGGLE_SPLIT:
      return { ...state, splitCharts: action.value };

    case A.TOGGLE_SHOW_DATA:
      return { ...state, showData: action.value };

    case A.TOGGLE_VALUE_TOOL: {
      const pos = action.value ? action.centerX : null;
      return {
        ...state,
        valueToolEnabled: action.value,
        valueToolPos: action.value
          ? { combined: pos, before: pos, after: pos }
          : state.valueToolPos,
      };
    }

    case A.SET_VALUE_TOOL_POS:
      return {
        ...state,
        valueToolPos: { ...state.valueToolPos, [action.panel]: action.x },
      };

    case A.ADD_LINE: {
      const next = [...state.thresholdLines[action.panel], action.line].sort(
        (a, b) => a.x - b.x,
      );
      return {
        ...state,
        thresholdLines: { ...state.thresholdLines, [action.panel]: next },
      };
    }

    case A.MOVE_LINE: {
      const next = state.thresholdLines[action.panel].map((l) =>
        l.id === action.id ? { ...l, x: action.x } : l,
      );
      return {
        ...state,
        thresholdLines: { ...state.thresholdLines, [action.panel]: next },
      };
    }

    case A.DRAG_START:
      return { ...state, draggingLineId: action.id };

    case A.DRAG_END: {
      const next = [...state.thresholdLines[action.panel]].sort(
        (a, b) => a.x - b.x,
      );
      return {
        ...state,
        draggingLineId: null,
        thresholdLines: { ...state.thresholdLines, [action.panel]: next },
      };
    }

    case A.CLEAR_LINES:
      return {
        ...state,
        thresholdLines: emptyPerPanel(() => []),
        groupMode: GROUP_MODES.NONE,
      };

    case A.RESET_CUSTOM_LINES:
      return { ...state, thresholdLines: emptyPerPanel(() => []) };

    default:
      return state;
  }
};

/**
 * @param {{initialIntervalWidth?: number}} [options]
 */
export const useDotPlotTools = ({ initialIntervalWidth = 5 } = {}) => {
  const [state, dispatch] = useReducer(
    reducer,
    initialIntervalWidth,
    initialState,
  );

  const setGroupMode = useCallback(
    (mode) => dispatch({ type: A.SET_GROUP_MODE, mode }),
    [],
  );

  const setIntervalWidth = useCallback((text) => {
    const numeric = parseFloat(text);
    dispatch({
      type: A.SET_INTERVAL_WIDTH,
      text,
      numeric: !Number.isNaN(numeric) && numeric > 0 ? numeric : undefined,
    });
  }, []);

  const setFixedGroupSize = useCallback((text) => {
    const numeric = parseInt(text, 10);
    dispatch({
      type: A.SET_FIXED_GROUP_SIZE,
      text,
      numeric: !Number.isNaN(numeric) && numeric > 0 ? numeric : undefined,
    });
  }, []);

  const setSplitCharts = useCallback(
    (value) => dispatch({ type: A.TOGGLE_SPLIT, value }),
    [],
  );

  const setShowData = useCallback(
    (value) => dispatch({ type: A.TOGGLE_SHOW_DATA, value }),
    [],
  );

  const setValueToolEnabled = useCallback(
    (value, centerX = 0) =>
      dispatch({ type: A.TOGGLE_VALUE_TOOL, value, centerX }),
    [],
  );

  const setValueToolPos = useCallback(
    (panel, x) => dispatch({ type: A.SET_VALUE_TOOL_POS, panel, x }),
    [],
  );

  const addLine = useCallback((panel, x) => {
    dispatch({
      type: A.ADD_LINE,
      panel,
      line: { id: makeId(), x, isDraggable: true },
    });
  }, []);

  const moveLine = useCallback(
    (panel, id, x) => dispatch({ type: A.MOVE_LINE, panel, id, x }),
    [],
  );

  const startDrag = useCallback(
    (id) => dispatch({ type: A.DRAG_START, id }),
    [],
  );

  const endDrag = useCallback(
    (panel) => dispatch({ type: A.DRAG_END, panel }),
    [],
  );

  const clearAll = useCallback(() => dispatch({ type: A.CLEAR_LINES }), []);

  const hasAnyLines = useMemo(
    () =>
      PANELS.some((p) => state.thresholdLines[p].length > 0) ||
      state.groupMode !== GROUP_MODES.NONE,
    [state.thresholdLines, state.groupMode],
  );

  return {
    state,
    actions: {
      setGroupMode,
      setIntervalWidth,
      setFixedGroupSize,
      setSplitCharts,
      setShowData,
      setValueToolEnabled,
      setValueToolPos,
      addLine,
      moveLine,
      startDrag,
      endDrag,
      clearAll,
    },
    hasAnyLines,
  };
};

export default () => null;
