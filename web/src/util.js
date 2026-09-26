export const fmtDate = (d) => (d ? new Date(d).toLocaleString() : '—');
export const fmtNum = (n) => (n ?? 0).toLocaleString();
export function timeAgo(d) {
  if (!d) return '—';
  const s = Math.round((Date.now() - new Date(d)) / 1000);
  if (s < 0) return 'in ' + timeLeft(d);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
export function timeLeft(d) {
  const s = Math.round((new Date(d) - Date.now()) / 1000);
  if (s <= 0) return 'expired';
  if (s < 3600) return `${Math.ceil(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}
// For <input type="datetime-local">
export function toLocalInput(d) {
  if (!d) return '';
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 16);
}
