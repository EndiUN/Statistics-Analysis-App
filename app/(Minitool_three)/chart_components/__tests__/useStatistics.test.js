/**
 * Unit tests for the pure statistical helpers exported from
 * chart_components/useStatistics.js (Minitool 3 – scatter plot).
 *
 * The four exported functions — computeGridCounts, computeQuadrantCounts,
 * computeTwoGroups and computeFourGroups — are pure math with no React
 * dependency, so they run in plain Node.
 */

import {
  computeGridCounts,
  computeQuadrantCounts,
  computeTwoGroups,
  computeFourGroups,
} from '../useStatistics';

// ---------------------------------------------------------------------------
// computeGridCounts
// ---------------------------------------------------------------------------
describe('computeGridCounts', () => {
  const xDomain = [0, 10];
  const yDomain = [0, 10];

  test('returns a gridSize × gridSize zero matrix for empty data', () => {
    const { counts } = computeGridCounts([], 2, xDomain, yDomain);
    expect(counts).toEqual([
      [0, 0],
      [0, 0],
    ]);
  });

  test('places a point in the correct cell of a 2×2 grid', () => {
    // Grid 2×2 on [0,10]×[0,10] → cells split at x=5 and y=5.
    // Point (2, 8) → col 0, row 0 (top-left, since rows go top→bottom).
    const { counts } = computeGridCounts(
      [{ x: 2, y: 8 }],
      2,
      xDomain,
      yDomain,
    );
    expect(counts[0][0]).toBe(1);
    // All other cells empty
    expect(counts[0][1]).toBe(0);
    expect(counts[1][0]).toBe(0);
    expect(counts[1][1]).toBe(0);
  });

  test('clamps edge values into the last row / column', () => {
    // Point exactly at (10, 0) — the bottom-right corner.
    // Without clamping, col = floor((10-0)/5) = 2, which is out of range.
    const { counts } = computeGridCounts(
      [{ x: 10, y: 0 }],
      2,
      xDomain,
      yDomain,
    );
    const total = counts.flat().reduce((s, v) => s + v, 0);
    expect(total).toBe(1); // exactly one cell got the point
  });

  test('returns correct step sizes', () => {
    const { xStep, yStep } = computeGridCounts([], 4, [0, 20], [0, 40]);
    expect(xStep).toBe(5); // (20-0)/4
    expect(yStep).toBe(10); // (40-0)/4
  });

  test('distributes multiple points across cells', () => {
    // 2×2 grid on [0,10]×[0,10]
    const data = [
      { x: 1, y: 9 }, // top-left
      { x: 6, y: 9 }, // top-right
      { x: 1, y: 1 }, // bottom-left
      { x: 6, y: 1 }, // bottom-right
      { x: 6, y: 1 }, // bottom-right again
    ];
    const { counts } = computeGridCounts(data, 2, xDomain, yDomain);
    expect(counts).toEqual([
      [1, 1],
      [1, 2],
    ]);
  });
});

// ---------------------------------------------------------------------------
// computeQuadrantCounts
// ---------------------------------------------------------------------------
describe('computeQuadrantCounts', () => {
  test('returns [0,0,0,0] for empty data', () => {
    expect(computeQuadrantCounts([], 5, 5)).toEqual([0, 0, 0, 0]);
  });

  test('distributes points into four quadrants around the cross centre', () => {
    const data = [
      { x: 2, y: 8 }, // top-left  (x≤5, y≥5)
      { x: 8, y: 8 }, // top-right (x>5, y≥5)
      { x: 2, y: 2 }, // bot-left  (x≤5, y<5)
      { x: 8, y: 2 }, // bot-right (x>5, y<5)
    ];
    expect(computeQuadrantCounts(data, 5, 5)).toEqual([1, 1, 1, 1]);
  });

  test('counts boundary points correctly (x=cx goes left, y=cy goes top)', () => {
    // A point exactly on the cross centre (5,5): x≤5 && y≥5 → TL
    expect(computeQuadrantCounts([{ x: 5, y: 5 }], 5, 5)).toEqual([
      1, 0, 0, 0,
    ]);
  });

  test('handles all points in one quadrant', () => {
    const data = [
      { x: 1, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 3 },
    ];
    // All x≤5, all y<5 → bottom-left
    expect(computeQuadrantCounts(data, 5, 5)).toEqual([0, 0, 3, 0]);
  });
});

// ---------------------------------------------------------------------------
// computeTwoGroups
// ---------------------------------------------------------------------------
describe('computeTwoGroups', () => {
  const xDomain = [0, 10];

  test('returns correct number of slices', () => {
    const slices = computeTwoGroups([], 3, xDomain);
    expect(slices).toHaveLength(3);
  });

  test('empty slice has null low/high/median and count 0', () => {
    const slices = computeTwoGroups([], 2, xDomain);
    expect(slices[0]).toMatchObject({
      low: null,
      high: null,
      median: null,
      count: 0,
    });
  });

  test('computes low, high and median for points in a slice', () => {
    // 2 slices on [0,10]: slice 0 = [0,5), slice 1 = [5,10]
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
    ];
    const slices = computeTwoGroups(data, 2, xDomain);
    // All 3 points fall in slice 0 (x < 5)
    expect(slices[0].low).toBe(10);
    expect(slices[0].high).toBe(30);
    expect(slices[0].median).toBe(20);
    expect(slices[0].count).toBe(3);
    // Slice 1 is empty
    expect(slices[1].count).toBe(0);
  });

  test('sets correct xLo/xHi boundaries for each slice', () => {
    const slices = computeTwoGroups([], 4, [0, 20]);
    expect(slices[0].xLo).toBe(0);
    expect(slices[0].xHi).toBe(5);
    expect(slices[3].xLo).toBe(15);
    expect(slices[3].xHi).toBe(20);
  });

  test('clamps right-edge point into last slice', () => {
    // x = 10 is exactly xMax; should go into the last slice, not overflow.
    const slices = computeTwoGroups([{ x: 10, y: 5 }], 2, xDomain);
    expect(slices[1].count).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computeFourGroups
// ---------------------------------------------------------------------------
describe('computeFourGroups', () => {
  const xDomain = [0, 10];

  test('returns correct number of slices', () => {
    const slices = computeFourGroups([], 3, xDomain);
    expect(slices).toHaveLength(3);
  });

  test('empty slice has null for all summary stats', () => {
    const slices = computeFourGroups([], 2, xDomain);
    expect(slices[0]).toMatchObject({
      low: null,
      high: null,
      q1: null,
      median: null,
      q3: null,
      count: 0,
    });
  });

  test('computes full five-number summary for a populated slice', () => {
    // Put 5 points into slice 0 (x < 5): y = [10,20,30,40,50]
    const data = [
      { x: 1, y: 50 },
      { x: 2, y: 10 },
      { x: 3, y: 30 },
      { x: 4, y: 20 },
      { x: 4.5, y: 40 },
    ];
    const slices = computeFourGroups(data, 2, xDomain);
    const s = slices[0];
    expect(s.count).toBe(5);
    expect(s.low).toBe(10);
    expect(s.high).toBe(50);
    expect(s.median).toBe(30);
    // Sorted y = [10,20,30,40,50]; lower = [10,20] → q1=15; upper = [40,50] → q3=45
    expect(s.q1).toBe(15);
    expect(s.q3).toBe(45);
  });

  test('returns null for q1/q3 when slice has only 1 point', () => {
    const slices = computeFourGroups([{ x: 1, y: 42 }], 2, xDomain);
    expect(slices[0].median).toBe(42);
    expect(slices[0].q1).toBeNull();
    expect(slices[0].q3).toBeNull();
  });

  test('computes q1/q3 for a slice with exactly 2 points', () => {
    const data = [
      { x: 1, y: 10 },
      { x: 2, y: 20 },
    ];
    const slices = computeFourGroups(data, 2, xDomain);
    const s = slices[0];
    expect(s.count).toBe(2);
    expect(s.median).toBe(15); // (10+20)/2
    // lower = [10] → q1=10; upper = [20] → q3=20
    expect(s.q1).toBe(10);
    expect(s.q3).toBe(20);
  });
});
