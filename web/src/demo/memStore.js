// In-browser replacement for server/src/store.js (demo build only). Data resets on reload.
export function createStore(_name, seed) {
  const data = seed();
  return { data, save() {}, flush() {} };
}
export const newId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
