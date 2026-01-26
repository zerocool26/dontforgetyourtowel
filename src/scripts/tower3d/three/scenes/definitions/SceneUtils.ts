export const damp = (
  current: number,
  target: number,
  lambda: number,
  dt: number
) => current + (target - current) * (1 - Math.exp(-lambda * dt));
