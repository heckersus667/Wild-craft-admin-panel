// LIVE game backend: FOR THE WILDCRAFT DEV TO FILL IN.
//
// Every function must match the one with the same name in mockAdapter.js
// (same arguments, same return shape). The panel only talks to the game
// through these functions, so nothing else needs to change.
//
// Enable with GAME_ADAPTER=live in .env.
//
// Example below assumes an internal HTTP API on the game backend. Replace the
// paths with whatever the real backend exposes (or call its database / RPC).

const BASE = process.env.GAME_API_URL;
const KEY = process.env.GAME_API_KEY;

async function call(method, path, body) {
  if (!BASE) throw new Error('GAME_API_URL is not set');
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = new Error(`Game API ${method} ${path} failed: ${res.status}`);
    err.status = res.status >= 500 ? 502 : res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

const qs = (o) => '?' + new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')).toString();
const todo = (name) => async () => {
  throw Object.assign(new Error(`liveAdapter.${name} is not implemented yet`), { status: 501 });
};

export const liveAdapter = {
  name: 'live',

  // Implemented as examples. Adjust paths to the real API.
  getStats: () => call('GET', '/admin/stats'),
  listPlayers: (opts) => call('GET', '/admin/players' + qs(opts)),
  getPlayer: (id) => call('GET', `/admin/players/${encodeURIComponent(id)}`),
  banPlayer: (id, body) => call('POST', `/admin/players/${encodeURIComponent(id)}/ban`, body),
  unbanPlayer: (id) => call('POST', `/admin/players/${encodeURIComponent(id)}/unban`),

  // Still to do.
  mutePlayer: todo('mutePlayer'),
  unmutePlayer: todo('unmutePlayer'),
  kickPlayer: todo('kickPlayer'),
  warnPlayer: todo('warnPlayer'),
  renamePlayer: todo('renamePlayer'),
  getPlayerChat: todo('getPlayerChat'),
  listReports: todo('listReports'),
  updateReport: todo('updateReport'),
  searchChat: todo('searchChat'),
  listSkins: todo('listSkins'),
  adjustCurrency: todo('adjustCurrency'),
  setSkin: todo('setSkin'),
  listTransactions: todo('listTransactions'),
  listServers: todo('listServers'),
  setMaintenance: todo('setMaintenance'),
  restartServer: todo('restartServer'),
  listAnnouncements: todo('listAnnouncements'),
  createAnnouncement: todo('createAnnouncement'),
  deleteAnnouncement: todo('deleteAnnouncement'),
  listEvents: todo('listEvents'),
  saveEvent: todo('saveEvent'),
  deleteEvent: todo('deleteEvent'),
  listPromos: todo('listPromos'),
  createPromo: todo('createPromo'),
  setPromoEnabled: todo('setPromoEnabled'),
  deletePromo: todo('deletePromo'),
  listFilterWords: todo('listFilterWords'),
  addFilterWord: todo('addFilterWord'),
  removeFilterWord: todo('removeFilterWord'),
};
