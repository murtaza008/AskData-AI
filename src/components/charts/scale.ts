/** Small scale helpers for the SVG charts (no chart library). */

/** "Nice" axis ticks from 0 (or the minimum, if negative) to at least `max`. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  const low = Math.min(0, min);
  const high = max <= low ? low + 1 : max;
  const raw = (high - low) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const start = Math.floor(low / step) * step;
  const ticks: number[] = [];
  for (let value = start; value <= high + step * 0.001; value += step) ticks.push(Number(value.toFixed(10)));
  if (ticks[ticks.length - 1] < high) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

export function linear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

/** Every n-th label so x-axis labels never collide (about `space` px each). */
export function labelStride(count: number, width: number, space = 72): number {
  return Math.max(1, Math.ceil(count / Math.max(1, Math.floor(width / space))));
}
