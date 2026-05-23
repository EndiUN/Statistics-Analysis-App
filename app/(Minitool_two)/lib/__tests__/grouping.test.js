/**
 * Unit tests for lib/grouping.js — verifies that each grouping mode produces
 * the correct guide-line positions in *data space*.
 */

import { GROUP_MODES, generateGuideValues } from '../grouping';

const sampleValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

describe('grouping.generateGuideValues', () => {
  test('returns empty array for empty / nullish input regardless of mode', () => {
    expect(generateGuideValues(GROUP_MODES.MEDIAN, [])).toEqual([]);
    expect(generateGuideValues(GROUP_MODES.MEDIAN, null)).toEqual([]);
    expect(generateGuideValues(GROUP_MODES.QUARTILES, [])).toEqual([]);
  });

  test('NONE mode returns no guide lines', () => {
    expect(generateGuideValues(GROUP_MODES.NONE, sampleValues)).toEqual([]);
  });

  test('CUSTOM mode returns no guide lines (handled by user threshold lines)', () => {
    expect(generateGuideValues(GROUP_MODES.CUSTOM, sampleValues)).toEqual([]);
  });

  test('MEDIAN mode returns a single line at the median', () => {
    // Even-count median = (5+6)/2 = 5.5
    expect(generateGuideValues(GROUP_MODES.MEDIAN, sampleValues)).toEqual([5.5]);
  });

  test('QUARTILES mode returns Q1, median, Q3 in ascending order', () => {
    const lines = generateGuideValues(GROUP_MODES.QUARTILES, sampleValues);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBeLessThan(lines[1]);
    expect(lines[1]).toBeLessThan(lines[2]);
    expect(lines[1]).toBe(5.5); // median
  });

  describe('FIXED_INTERVAL mode', () => {
    test('returns no lines when intervalWidth is missing or invalid', () => {
      expect(
        generateGuideValues(GROUP_MODES.FIXED_INTERVAL, sampleValues),
      ).toEqual([]);
      expect(
        generateGuideValues(GROUP_MODES.FIXED_INTERVAL, sampleValues, {
          intervalWidth: 0,
        }),
      ).toEqual([]);
    });

    test('produces interior boundaries only', () => {
      // Values 1..10 with width 3: floor(1/3)*3 = 0; lines at 3, 6, 9
      const lines = generateGuideValues(GROUP_MODES.FIXED_INTERVAL, sampleValues, {
        intervalWidth: 3,
      });
      expect(lines).toEqual([3, 6, 9]);
    });

    test('snaps the start to a multiple of intervalWidth', () => {
      // Values starting at 7 with width 5: floor(7/5)*5 = 5; lines at 10, 15
      const lines = generateGuideValues(
        GROUP_MODES.FIXED_INTERVAL,
        [7, 9, 12, 18],
        { intervalWidth: 5 },
      );
      expect(lines).toEqual([10, 15]);
    });
  });

  describe('FIXED_GROUP_SIZE mode', () => {
    test('returns no lines when fixedGroupSize is missing or invalid', () => {
      expect(
        generateGuideValues(GROUP_MODES.FIXED_GROUP_SIZE, sampleValues),
      ).toEqual([]);
      expect(
        generateGuideValues(GROUP_MODES.FIXED_GROUP_SIZE, sampleValues, {
          fixedGroupSize: 0,
        }),
      ).toEqual([]);
    });

    test('places lines between groups of N sorted values', () => {
      // Sorted = [1..10], group size 3 → split after index 3, 6, 9
      // Lines at midpoints: (3+4)/2=3.5, (6+7)/2=6.5, (9+10)/2=9.5
      const lines = generateGuideValues(
        GROUP_MODES.FIXED_GROUP_SIZE,
        sampleValues,
        { fixedGroupSize: 3 },
      );
      expect(lines).toEqual([3.5, 6.5, 9.5]);
    });

    test('returns empty when group size equals data length', () => {
      const lines = generateGuideValues(
        GROUP_MODES.FIXED_GROUP_SIZE,
        sampleValues,
        { fixedGroupSize: 10 },
      );
      expect(lines).toEqual([]);
    });
  });

  test('unknown mode returns empty array', () => {
    expect(generateGuideValues('not-a-real-mode', sampleValues)).toEqual([]);
  });
});
