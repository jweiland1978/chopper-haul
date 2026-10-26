/** Mulberry32. Deterministic gameplay RNG. */
export function createRng(seed) {
  let s = (seed >>> 0) || 1;
  const next = () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (n) => (next() * n) | 0;
  next.range = (a, b) => a + next() * (b - a);
  next.pick = (arr) => arr[(next() * arr.length) | 0];
  next.chance = (p) => next() < p;
  next.seed = (n) => { s = (n >>> 0) || 1; };
  next.getSeed = () => s >>> 0;
  return next;
}

export const rng = createRng(1);
