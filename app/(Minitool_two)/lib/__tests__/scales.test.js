/**
 * Unit tests for lib/scales.js.
 *
 * Wraps d3-scale + the project's tick-generation rules.
 */

import { createXScale, generateAxisTicks } from '../scales';

describe('scales.createXScale', () => {
  test('maps domain to range linearly', () => {
    const scale = createXScale({ min: 0, max: 100 }, [0, 200]);
    expect(scale(0)).toBe(0);
    expect(scale(50)).toBe(100);
    expect(scale(100)).toBe(200);
  });

  test('handles non-zero domain start', () => {
    const scale = createXScale({ min: 50, max: 150 }, [0, 100]);
    expect(scale(50)).toBe(0);
    expect(scale(100)).toBe(50);
    expect(scale(150)).toBe(100);
  });
});

describe('scales.generateAxisTicks', () => {
  test('returns empty array for non-finite domain', () => {
    const scale = createXScale({ min: NaN, max: 10 }, [0, 100]);
    expect(generateAxisTicks(scale, 1)).toEqual([]);
  });

  test('generates evenly-spaced ticks when step is provided', () => {
    const scale = createXScale({ min: 0, max: 20 }, [0, 100]);
    expect(generateAxisTicks(scale, 5)).toEqual([0, 5, 10, 15, 20]);
  });

  test('always includes domain endpoints, even on irregular steps', () => {
    const scale = createXScale({ min: 1, max: 19 }, [0, 100]);
    const ticks = generateAxisTicks(scale, 5);
    expect(ticks[0]).toBe(1);
    expect(ticks[ticks.length - 1]).toBe(19);
  });

  test('falls back to d3 ~5-tick algorithm when step is null', () => {
    const scale = createXScale({ min: 0, max: 100 }, [0, 100]);
    const ticks = generateAxisTicks(scale, null);
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBe(100);
  });

  test('returns ascending unique ticks', () => {
    const scale = createXScale({ min: 0, max: 10 }, [0, 100]);
    const ticks = generateAxisTicks(scale, 5);
    const sorted = [...ticks].sort((a, b) => a - b);
    expect(ticks).toEqual(sorted);
    expect(new Set(ticks).size).toBe(ticks.length);
  });
});
