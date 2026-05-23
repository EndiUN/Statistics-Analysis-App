/**
 * Pure statistical helpers for Minitool 2.
 * No React, no side-effects — fully unit-testable.
 *
 * All functions assume numeric input arrays. Empty inputs return safe defaults
 * so callers don't need to guard.
 */

import { bisectRight } from 'd3-array';

/** Returns the arithmetic mean of `values`, or 0 for an empty array. */
export const mean = (values) => {
  if (!values || values.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  return sum / values.length;
};

/** Returns the median of an already-sorted ascending array. */
const medianOfSorted = (sorted) => {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

/**
 * Computes the five-number summary (min, Q1, median, Q3, max) using the
 * "exclusive" (Tukey) method: the median splits the data, and Q1/Q3 are
 * the medians of the lower/upper halves.
 *
 * @param {number[]} values - unsorted numeric values
 * @returns {{min:number,q1:number,median:number,q3:number,max:number}}
 */
export const quartiles = (values) => {
  if (!values || values.length === 0) {
    return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  const lower = sorted.slice(0, mid);
  const upper = n % 2 === 0 ? sorted.slice(mid) : sorted.slice(mid + 1);
  return {
    min: sorted[0],
    q1: medianOfSorted(lower),
    median: medianOfSorted(sorted),
    q3: medianOfSorted(upper),
    max: sorted[n - 1],
  };
};

/** Returns a stable ascending-sorted copy of `values`. */
export const sortAscending = (values) => [...values].sort((a, b) => a - b);

/**
 * Computes vertical "stack levels" for a dot plot so overlapping dots are
 * placed at increasing levels above the axis. Runs in O(n log n + n·L) where
 * L is the maximum stack height (small in practice).
 *
 * Implementation notes:
 *  - `levelLastX` is a Float64Array for cache-friendly linear scans.
 *  - Each dot is allocated exactly once (no object spread per element)
 *    so the function stays linear in allocations even for large n.
 *
 * @param {Array<{value:number, type?:string}>} data
 * @param {(v:number)=>number} xScale - maps data value -> pixel x
 * @param {number} dotRadius
 * @returns {Array<{value:number, type?:string, level:number, x:number}>}
 */
export const computeScatterLevels = (data, xScale, dotRadius) => {
  if (!data || data.length === 0) return [];
  const minDistance = dotRadius * 2;
  const n = data.length;

  // Build a single working array, sort by x in place.
  const sorted = new Array(n);
  for (let i = 0; i < n; i++) {
    const d = data[i];
    sorted[i] = { value: d.value, type: d.type, x: xScale(d.value), level: 0 };
  }
  sorted.sort((a, b) => a.x - b.x);

  // Float64Array gives us a contiguous, primitive-typed buffer for the
  // first-fit scan -- no boxing, friendly to the CPU prefetcher.
  let levelLastX = new Float64Array(8);
  let levelCount = 0;

  for (let i = 0; i < n; i++) {
    const dot = sorted[i];
    let level = 0;
    while (level < levelCount && dot.x - levelLastX[level] < minDistance) {
      level++;
    }
    if (level >= levelLastX.length) {
      const grown = new Float64Array(levelLastX.length * 2);
      grown.set(levelLastX);
      levelLastX = grown;
    }
    levelLastX[level] = dot.x;
    if (level === levelCount) levelCount++;
    dot.level = level + 1; // 1-indexed for rendering
  }
  return sorted;
};

/**
 * Counts how many values fall inside each consecutive (left-closed,
 * right-open) bucket defined by `boundaries`. The final bucket is
 * right-closed so the maximum value is always included.
 *
 * Uses binary search (O(n log b)) instead of a linear scan over boundaries,
 * which matters when fixed-interval grouping produces many bins.
 *
 * @param {number[]} values
 * @param {number[]} boundaries - ascending domain values including chart edges
 * @returns {number[]} counts with length boundaries.length - 1
 */
export const bucketCounts = (values, boundaries) => {
  const b = boundaries.length;
  if (b < 2) return [];
  const counts = new Array(b - 1).fill(0);
  const last = b - 2;
  const lo = boundaries[0];
  const hi = boundaries[b - 1];

  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v < lo || v > hi) continue;
    if (v === hi) {
      counts[last]++;
      continue;
    }
    // bisectRight returns first index `j` with boundaries[j] > v.
    // The bucket containing v is therefore j - 1.
    const idx = bisectRight(boundaries, v) - 1;
    if (idx >= 0 && idx <= last) counts[idx]++;
  }
  return counts;
};

export default () => null;
