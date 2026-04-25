export const sampleBezier = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return {
    x: (u * u * u) * p0.x + 3 * (u * u) * t * p1.x + 3 * u * (t * t) * p2.x + (t * t * t) * p3.x,
    y: (u * u * u) * p0.y + 3 * (u * u) * t * p1.y + 3 * u * (t * t) * p2.y + (t * t * t) * p3.y
  };
};

export const buildSagBezierControls = (a, b, opts = {}) => {
  const {
    minLen = 20,
    sagFactor = 0.18,
    minSag = 8,
    maxSag = 120
  } = opts || {};
  const ax = +a.x || 0;
  const ay = +a.y || 0;
  const bx = +b.x || 0;
  const by = +b.y || 0;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.max(Math.max(1, Number(minLen) || 1), Math.hypot(dx, dy));
  const sag = Math.max(Math.max(0, Number(minSag) || 0), Math.min(Math.max(0, Number(maxSag) || 0), len * (Number(sagFactor) || 0)));
  return {
    c1: { x: ax + dx * 0.25, y: ay + dy * 0.25 + sag },
    c2: { x: ax + dx * 0.75, y: ay + dy * 0.75 + sag }
  };
};

export const estimateBezierLength = (p0, p1, p2, p3, steps = 24) => {
  const n = Math.max(2, Math.round(Number(steps) || 24));
  let total = 0;
  let prev = { x: +p0.x || 0, y: +p0.y || 0 };
  for (let i = 1; i <= n; i++) {
    const p = sampleBezier(p0, p1, p2, p3, i / n);
    total += Math.hypot((+p.x || 0) - (+prev.x || 0), (+p.y || 0) - (+prev.y || 0));
    prev = p;
  }
  return total;
};
