export class BadRequest extends Error {
  status = 400;
}
export function str(v, name, { min = 1, max = 500, optional = false, trim = true } = {}) {
  if (v === undefined || v === null || v === '') {
    if (optional) return '';
    throw new BadRequest(`${name} is required`);
  }
  if (typeof v !== 'string') throw new BadRequest(`${name} must be text`);
  if (trim) v = v.trim();
  if (v.length < min || v.length > max) throw new BadRequest(`${name} must be ${min}-${max} characters`);
  return v;
}
export const password = (v, name, min = 10) => str(v, name, { min, max: 200, trim: false });
export function int(v, name, { min = -Infinity, max = Infinity, optional = false } = {}) {
  if (v === undefined || v === null || v === '') {
    if (optional) return null;
    throw new BadRequest(`${name} is required`);
  }
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new BadRequest(`${name} must be a whole number between ${min} and ${max}`);
  return n;
}
export function bool(v, name) {
  if (typeof v !== 'boolean') throw new BadRequest(`${name} must be true or false`);
  return v;
}
const MIN_DATE = Date.UTC(2000, 0, 1);
const MAX_DATE = Date.UTC(2100, 0, 1);
export function date(v, name, { optional = false } = {}) {
  if (!v) {
    if (optional) return null;
    throw new BadRequest(`${name} is required`);
  }
  if (typeof v !== 'string') throw new BadRequest(`${name} must be a date`);
  const t = Date.parse(v);
  if (isNaN(t) || t < MIN_DATE || t > MAX_DATE) throw new BadRequest(`${name} is not a valid date`);
  return new Date(t).toISOString();
}
export function oneOf(v, name, options) {
  if (!options.includes(v)) throw new BadRequest(`${name} must be one of: ${options.join(', ')}`);
  return v;
}
// Query string values: only plain strings (?q=a&q=b or ?q[x]=1 become '').
export const qstr = (v) => (typeof v === 'string' ? v.slice(0, 200) : '');
// Page numbers from the query string, clamped.
export function paging(query, defaultSize = 25) {
  const page = Math.max(1, Math.min(100000, parseInt(query.page, 10) || 1));
  const pageSize = Math.max(1, Math.min(100, parseInt(query.pageSize, 10) || defaultSize));
  return { page, pageSize };
}
