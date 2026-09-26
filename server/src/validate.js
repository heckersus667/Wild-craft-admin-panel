export class BadRequest extends Error {
  status = 400;
}
export function str(v, name, { min = 1, max = 500, optional = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (optional) return '';
    throw new BadRequest(`${name} is required`);
  }
  if (typeof v !== 'string') throw new BadRequest(`${name} must be text`);
  v = v.trim();
  if (v.length < min || v.length > max) throw new BadRequest(`${name} must be ${min}-${max} characters`);
  return v;
}
export function int(v, name, { min = -Infinity, max = Infinity, optional = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (optional) return null;
    throw new BadRequest(`${name} is required`);
  }
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new BadRequest(`${name} must be a whole number between ${min} and ${max}`);
  return n;
}
export function date(v, name, { optional = false } = {}) {
  if (!v) {
    if (optional) return null;
    throw new BadRequest(`${name} is required`);
  }
  const d = new Date(v);
  if (isNaN(d)) throw new BadRequest(`${name} is not a valid date`);
  return d.toISOString();
}
export function oneOf(v, name, options) {
  if (!options.includes(v)) throw new BadRequest(`${name} must be one of: ${options.join(', ')}`);
  return v;
}
