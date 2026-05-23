/**
 * Scale + axis-tick helpers. Thin wrappers over d3-scale that add the
 * project-specific tick behaviour (custom step, always include domain
 * endpoints).
 */

import { scaleLinear } from 'd3-scale';

/**
 * @param {{min:number, max:number}} domain
 * @param {[number, number]} range - pixel range [start, end]
 */
export const createXScale = (domain, range) =>
  scaleLinear()
    .domain([domain.min, domain.max])
    .range(range);

/**
 * Generates axis ticks. If `step` is provided, ticks are placed at every
 * `step` value within the domain; otherwise d3 picks ~5 nice ticks.
 * Domain endpoints are always included.
 *
 * @param {ReturnType<typeof createXScale>} scale
 * @param {number|null|undefined} step
 * @returns {number[]} ascending unique ticks
 */
export const generateAxisTicks = (scale, step) => {
  const [min, max] = scale.domain();
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];

  const ticks = [];
  if (step && step > 0) {
    const start = Math.ceil(min / step) * step;
    for (let t = start; t <= max; t += step) ticks.push(t);
  } else {
    ticks.push(...scale.ticks(5));
  }
  if (!ticks.some((t) => Math.abs(t - min) < 1e-9)) ticks.unshift(min);
  if (!ticks.some((t) => Math.abs(t - max) < 1e-9)) ticks.push(max);
  return [...new Set(ticks)].sort((a, b) => a - b);
};

export default () => null;
