/**
 * Unit tests for the useDotPlotTools reducer hook.
 *
 * Exercises the public action API exposed by the hook (setGroupMode,
 * addLine, moveLine, etc.) and asserts the resulting state transitions.
 * Renders the hook with @testing-library/react-native's renderHook.
 */

import { act, renderHook } from '@testing-library/react-native';

import { useDotPlotTools } from '../useDotPlotTools';
import { GROUP_MODES } from '../../lib/grouping';

describe('useDotPlotTools — initial state', () => {
  test('seeds the interval width from options', () => {
    const { result } = renderHook(() =>
      useDotPlotTools({ initialIntervalWidth: 12 }),
    );
    expect(result.current.state.intervalWidth).toBe(12);
    expect(result.current.state.intervalWidthInput).toBe('12');
  });

  test('uses default interval width of 5 when no option is given', () => {
    const { result } = renderHook(() => useDotPlotTools());
    expect(result.current.state.intervalWidth).toBe(5);
  });

  test('starts in NONE group mode with no lines and no value tool', () => {
    const { result } = renderHook(() => useDotPlotTools());
    const { state, hasAnyLines } = result.current;
    expect(state.groupMode).toBe(GROUP_MODES.NONE);
    expect(state.thresholdLines.combined).toEqual([]);
    expect(state.thresholdLines.before).toEqual([]);
    expect(state.thresholdLines.after).toEqual([]);
    expect(state.valueToolEnabled).toBe(false);
    expect(state.valueToolPos.combined).toBeNull();
    expect(hasAnyLines).toBe(false);
  });
});

describe('useDotPlotTools — group mode', () => {
  test('setGroupMode updates the mode', () => {
    const { result } = renderHook(() => useDotPlotTools());
    act(() => result.current.actions.setGroupMode(GROUP_MODES.MEDIAN));
    expect(result.current.state.groupMode).toBe(GROUP_MODES.MEDIAN);
  });

  test('changing group mode atomically clears existing custom lines', () => {
    const { result } = renderHook(() => useDotPlotTools());

    // Add a couple of custom threshold lines first
    act(() => {
      result.current.actions.setGroupMode(GROUP_MODES.CUSTOM);
      result.current.actions.addLine('combined', 50);
      result.current.actions.addLine('combined', 100);
    });
    expect(result.current.state.thresholdLines.combined).toHaveLength(2);

    // Switching to MEDIAN must wipe them in the same render
    act(() => result.current.actions.setGroupMode(GROUP_MODES.MEDIAN));
    expect(result.current.state.thresholdLines.combined).toHaveLength(0);
  });
});

describe('useDotPlotTools — interval width and group size inputs', () => {
  test('accepts a numeric string and updates both text and numeric value', () => {
    const { result } = renderHook(() => useDotPlotTools());
    act(() => result.current.actions.setIntervalWidth('25'));
    expect(result.current.state.intervalWidthInput).toBe('25');
    expect(result.current.state.intervalWidth).toBe(25);
  });

  test('keeps the previous numeric value when the input is invalid', () => {
    const { result } = renderHook(() =>
      useDotPlotTools({ initialIntervalWidth: 5 }),
    );
    act(() => result.current.actions.setIntervalWidth('abc'));
    expect(result.current.state.intervalWidthInput).toBe('abc');
    expect(result.current.state.intervalWidth).toBe(5); // unchanged
  });

  test('rejects zero and negative interval widths', () => {
    const { result } = renderHook(() =>
      useDotPlotTools({ initialIntervalWidth: 5 }),
    );
    act(() => result.current.actions.setIntervalWidth('-3'));
    expect(result.current.state.intervalWidth).toBe(5);
    act(() => result.current.actions.setIntervalWidth('0'));
    expect(result.current.state.intervalWidth).toBe(5);
  });

  test('setFixedGroupSize parses positive integers only', () => {
    const { result } = renderHook(() => useDotPlotTools());
    act(() => result.current.actions.setFixedGroupSize('7'));
    expect(result.current.state.fixedGroupSize).toBe(7);
    act(() => result.current.actions.setFixedGroupSize('xyz'));
    expect(result.current.state.fixedGroupSize).toBe(7); // unchanged
  });
});

describe('useDotPlotTools — toggles', () => {
  test('setSplitCharts toggles the splitCharts flag', () => {
    const { result } = renderHook(() => useDotPlotTools());
    act(() => result.current.actions.setSplitCharts(true));
    expect(result.current.state.splitCharts).toBe(true);
    act(() => result.current.actions.setSplitCharts(false));
    expect(result.current.state.splitCharts).toBe(false);
  });

  test('setShowData toggles the showData flag', () => {
    const { result } = renderHook(() => useDotPlotTools());
    act(() => result.current.actions.setShowData(false));
    expect(result.current.state.showData).toBe(false);
  });

  test('setValueToolEnabled centres the tool across all panels when enabling', () => {
    const { result } = renderHook(() => useDotPlotTools());
    act(() => result.current.actions.setValueToolEnabled(true, 123));
    expect(result.current.state.valueToolEnabled).toBe(true);
    expect(result.current.state.valueToolPos).toEqual({
      combined: 123,
      before: 123,
      after: 123,
    });
  });

  test('setValueToolPos updates only the targeted panel', () => {
    const { result } = renderHook(() => useDotPlotTools());
    act(() => result.current.actions.setValueToolEnabled(true, 50));
    act(() => result.current.actions.setValueToolPos('before', 200));
    expect(result.current.state.valueToolPos.before).toBe(200);
    expect(result.current.state.valueToolPos.combined).toBe(50);
    expect(result.current.state.valueToolPos.after).toBe(50);
  });
});

describe('useDotPlotTools — threshold lines', () => {
  test('addLine appends a line with a unique id and keeps the panel sorted by x', () => {
    const { result } = renderHook(() => useDotPlotTools());
    act(() => {
      result.current.actions.addLine('combined', 100);
      result.current.actions.addLine('combined', 50);
      result.current.actions.addLine('combined', 75);
    });
    const xs = result.current.state.thresholdLines.combined.map((l) => l.x);
    expect(xs).toEqual([50, 75, 100]);

    const ids = result.current.state.thresholdLines.combined.map((l) => l.id);
    expect(new Set(ids).size).toBe(3); // all unique
  });

  test('moveLine updates only the matching line in the targeted panel', () => {
    const { result } = renderHook(() => useDotPlotTools());
    act(() => {
      result.current.actions.addLine('combined', 100);
      result.current.actions.addLine('combined', 50);
    });

    const target = result.current.state.thresholdLines.combined[0];
    act(() => result.current.actions.moveLine('combined', target.id, 999));

    const moved = result.current.state.thresholdLines.combined.find(
      (l) => l.id === target.id,
    );
    expect(moved.x).toBe(999);
  });

  test('drag lifecycle: startDrag sets id, endDrag re-sorts and clears it', () => {
    const { result } = renderHook(() => useDotPlotTools());
    act(() => {
      result.current.actions.addLine('combined', 100);
      result.current.actions.addLine('combined', 50);
    });
    const target = result.current.state.thresholdLines.combined[0]; // x=50

    act(() => result.current.actions.startDrag(target.id));
    expect(result.current.state.draggingLineId).toBe(target.id);

    // Move it past the other line so endDrag has something to sort
    act(() => result.current.actions.moveLine('combined', target.id, 200));
    act(() => result.current.actions.endDrag('combined'));

    expect(result.current.state.draggingLineId).toBeNull();
    const xs = result.current.state.thresholdLines.combined.map((l) => l.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  test('clearAll removes all lines and resets group mode to NONE', () => {
    const { result } = renderHook(() => useDotPlotTools());
    act(() => {
      result.current.actions.setGroupMode(GROUP_MODES.MEDIAN);
      result.current.actions.addLine('combined', 50);
      result.current.actions.addLine('before', 100);
    });
    expect(result.current.hasAnyLines).toBe(true);

    act(() => result.current.actions.clearAll());

    expect(result.current.state.groupMode).toBe(GROUP_MODES.NONE);
    expect(result.current.state.thresholdLines.combined).toEqual([]);
    expect(result.current.state.thresholdLines.before).toEqual([]);
    expect(result.current.hasAnyLines).toBe(false);
  });
});

describe('useDotPlotTools — derived hasAnyLines', () => {
  test('is true when any panel has threshold lines', () => {
    const { result } = renderHook(() => useDotPlotTools());
    act(() => result.current.actions.addLine('after', 10));
    expect(result.current.hasAnyLines).toBe(true);
  });

  test('is true when group mode is set even with no custom lines', () => {
    const { result } = renderHook(() => useDotPlotTools());
    act(() => result.current.actions.setGroupMode(GROUP_MODES.QUARTILES));
    expect(result.current.hasAnyLines).toBe(true);
  });
});
