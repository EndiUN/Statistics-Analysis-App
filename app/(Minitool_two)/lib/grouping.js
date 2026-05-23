/**
 * Group-mode definitions and guide-line generators for Minitool 2.
 *
 * A "guide line" is a non-draggable vertical line drawn from a statistical
 * grouping rule (median, quartiles, fixed interval, etc.). Returned values
 * are always in *data space* — the chart layer is responsible for mapping
 * them through its xScale.
 */

import { quartiles, sortAscending } from './statistics';

export const GROUP_MODES = Object.freeze({
  NONE: 'none',
  MEDIAN: 'median',
  QUARTILES: 'quartiles',
  FIXED_INTERVAL: 'fixed-interval',
  FIXED_GROUP_SIZE: 'fixed-group-size',
  CUSTOM: 'custom',
});

export const GROUP_MODE_OPTIONS = [
  { label: 'None', value: GROUP_MODES.NONE },
  { label: 'Two equal groups', value: GROUP_MODES.MEDIAN },
  { label: 'Four equal groups', value: GROUP_MODES.QUARTILES },
  { label: 'Fixed Interval', value: GROUP_MODES.FIXED_INTERVAL },
  { label: 'Fixed group size', value: GROUP_MODES.FIXED_GROUP_SIZE },
  { label: 'Create your own groups', value: GROUP_MODES.CUSTOM },
];

/**
 * @param {string} mode - one of GROUP_MODES
 * @param {number[]} values - raw numeric values
 * @param {{intervalWidth?:number, fixedGroupSize?:number}} [opts]
 * @returns {number[]} guide-line positions in data space (sorted ascending)
 */
export const generateGuideValues = (mode, values, opts = {}) => {
  if (!values || values.length === 0) return [];
  const { intervalWidth = 0, fixedGroupSize = 0 } = opts;

  switch (mode) {
    case GROUP_MODES.MEDIAN: {
      const { median } = quartiles(values);
      return [median];
    }
    case GROUP_MODES.QUARTILES: {
      const { q1, median, q3 } = quartiles(values);
      return [q1, median, q3];
    }
    case GROUP_MODES.FIXED_INTERVAL: {
      if (intervalWidth <= 0) return [];
      const min = Math.min(...values);
      const max = Math.max(...values);
      const start = Math.floor(min / intervalWidth) * intervalWidth;
      const lines = [];
      // Interior boundaries only (skip the first/last which are the chart edges).
      for (let v = start + intervalWidth; v < max; v += intervalWidth) {
        lines.push(v);
      }
      return lines;
    }
    case GROUP_MODES.FIXED_GROUP_SIZE: {
      if (fixedGroupSize <= 0) return [];
      const sorted = sortAscending(values);
      const lines = [];
      for (let i = fixedGroupSize; i < sorted.length; i += fixedGroupSize) {
        lines.push((sorted[i - 1] + sorted[i]) / 2);
      }
      return lines;
    }
    case GROUP_MODES.NONE:
    case GROUP_MODES.CUSTOM:
    default:
      return [];
  }
};

export default () => null;
