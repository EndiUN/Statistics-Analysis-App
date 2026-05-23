/**
 * Unit tests for the pure statistical helpers in lib/statistics.js.
 *
 * These functions have no React, no side effects, no DOM dependency, so they
 * run in pure Node and serve as the foundation that the rest of Minitool 2
 * relies on. If anything here breaks, every dot plot in the app is wrong.
 */

import {
  mean,
  quartiles,
  sortAscending,
  computeScatterLevels,
  bucketCounts,
} from '../statistics';

describe('statistics.mean', () => {
  test('returns 0 for empty input', () => {
    expect(mean([])).toBe(0);
    expect(mean(null)).toBe(0);
    expect(mean(undefined)).toBe(0);
  });

  test('computes the arithmetic mean', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3);
    expect(mean([10])).toBe(10);
    expect(mean([2.5, 7.5])).toBe(5);
  });

  test('handles negative numbers', () => {
    expect(mean([-2, -1, 0, 1, 2])).toBe(0);
  });
});

describe('statistics.quartiles', () => {
  test('returns zeros for empty input', () => {
    expect(quartiles([])).toEqual({
      min: 0,
      q1: 0,
      median: 0,
      q3: 0,
      max: 0,
    });
  });

  test('handles odd-length data with the exclusive (Tukey) method', () => {
    // For [1,2,3,4,5]: median=3; lower=[1,2] -> q1=1.5; upper=[4,5] -> q3=4.5
    const r = quartiles([5, 1, 3, 2, 4]);
    expect(r.min).toBe(1);
    expect(r.q1).toBe(1.5);
    expect(r.median).toBe(3);
    expect(r.q3).toBe(4.5);
    expect(r.max).toBe(5);
  });

  test('handles even-length data', () => {
    // For [1,2,3,4]: median=2.5; lower=[1,2] -> q1=1.5; upper=[3,4] -> q3=3.5
    const r = quartiles([4, 2, 1, 3]);
    expect(r.min).toBe(1);
    expect(r.q1).toBe(1.5);
    expect(r.median).toBe(2.5);
    expect(r.q3).toBe(3.5);
    expect(r.max).toBe(4);
  });

  test('does not mutate the input array', () => {
    const input = [3, 1, 2];
    quartiles(input);
    expect(input).toEqual([3, 1, 2]);
  });

  test('handles a single value', () => {
    expect(quartiles([42])).toEqual({
      min: 42,
      q1: 0, // empty lower half
      median: 42,
      q3: 0, // empty upper half
      max: 42,
    });
  });
});

describe('statistics.sortAscending', () => {
  test('returns ascending-sorted copy without mutating input', () => {
    const input = [3, 1, 2];
    const out = sortAscending(input);
    expect(out).toEqual([1, 2, 3]);
    expect(input).toEqual([3, 1, 2]);
  });

  test('handles empty array', () => {
    expect(sortAscending([])).toEqual([]);
  });
});

describe('statistics.computeScatterLevels', () => {
  // A trivial identity scale and a unit dot radius keep the math in pixels = values.
  const identityScale = (v) => v;

  test('returns empty array for empty / nullish input', () => {
    expect(computeScatterLevels([], identityScale, 5)).toEqual([]);
    expect(computeScatterLevels(null, identityScale, 5)).toEqual([]);
  });

  test('places non-overlapping dots all at level 1', () => {
    // x positions 0, 100, 200 with minDistance 2*5=10 → no overlap
    const data = [{ value: 0 }, { value: 100 }, { value: 200 }];
    const out = computeScatterLevels(data, identityScale, 5);
    expect(out.map((d) => d.level)).toEqual([1, 1, 1]);
  });

  test('stacks overlapping dots at increasing levels', () => {
    // All three points are at the same x → must stack
    const data = [{ value: 50 }, { value: 50 }, { value: 50 }];
    const out = computeScatterLevels(data, identityScale, 5);
    const levels = out.map((d) => d.level).sort();
    expect(levels).toEqual([1, 2, 3]);
  });

  test('preserves the type field on each dot', () => {
    const data = [
      { value: 1, type: 'before' },
      { value: 2, type: 'after' },
    ];
    const out = computeScatterLevels(data, identityScale, 1);
    expect(out.find((d) => d.value === 1).type).toBe('before');
    expect(out.find((d) => d.value === 2).type).toBe('after');
  });

  test('attaches an x pixel coordinate produced by the scale', () => {
    const scale = (v) => v * 10;
    const out = computeScatterLevels([{ value: 7 }], scale, 1);
    expect(out[0].x).toBe(70);
  });

  test('grows the internal level buffer beyond the initial capacity', () => {
    // Initial buffer is size 8; force more than 8 levels by stacking 12 dots
    // at the same x. This exercises the Float64Array growth path.
    const data = Array.from({ length: 12 }, () => ({ value: 50 }));
    const out = computeScatterLevels(data, identityScale, 5);
    const maxLevel = Math.max(...out.map((d) => d.level));
    expect(maxLevel).toBe(12);
  });
});

describe('statistics.bucketCounts', () => {
  test('returns empty array if fewer than 2 boundaries are given', () => {
    expect(bucketCounts([1, 2, 3], [])).toEqual([]);
    expect(bucketCounts([1, 2, 3], [10])).toEqual([]);
  });

  test('counts values into left-closed right-open buckets', () => {
    // Boundaries [0, 10, 20, 30] define 3 buckets: [0,10), [10,20), [20,30]
    const counts = bucketCounts([0, 5, 9, 10, 15, 20, 25, 30], [0, 10, 20, 30]);
    expect(counts).toEqual([3, 2, 3]); // [0,5,9], [10,15], [20,25,30]
  });

  test('always includes the maximum value in the last bucket', () => {
    const counts = bucketCounts([100], [0, 50, 100]);
    expect(counts).toEqual([0, 1]);
  });

  test('ignores values outside the boundary range', () => {
    const counts = bucketCounts([-5, 50, 105], [0, 50, 100]);
    expect(counts).toEqual([0, 1]); // -5 ignored, 50 in bucket 1, 105 ignored
  });

  test('handles an empty values array', () => {
    expect(bucketCounts([], [0, 10, 20])).toEqual([0, 0]);
  });
});
