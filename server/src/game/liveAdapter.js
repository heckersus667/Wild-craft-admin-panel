// LIVE game backend: FOR THE WILDCRAFT DEV TO FILL IN.
//
// Every function must match the one with the same name in mockAdapter.js
// (same arguments, same return shape). The full contract is in
// server/src/game/CONTRACT.md. The panel only talks to the game through
// these functions, so nothing else needs to change.
//
// Enable with GAME_ADAPTER=live in .env.
//
// Example below assumes an internal HTTP API on the game backend. Replace the
// paths with whatever the real backend exposes (or call its database / RPC).

const BASE = process.env.GAME_API_URL;
const KEY = process.env.GAME_API_KEY;

async function call(method, path, body, { idempotencyKey } = {}) {
  if (!BASE) throw Object.assign(new Error('GAME_API_URL is not set'), { status: 502 });
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEY}`,
        // Lets the game backend ignore a retried grant instead of applying it twice.
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    const timeout = e.name === 'TimeoutError';
    throw Object.assign(new Error(timeout ? 'Game server did not respond in time' : 'Could not reach the game server'), { status: 502 });
  }
  if (!res.ok) {
    let msg = '';
    try {
      const data = await res.json();
      msg = data.error || data.message || '';
    } catch {}
    // A 401/403 from the GAME means the panel's API key is wrong, not that the
    // staff member is logged out, so never pass those through as-is.
    if (res.status === 401 || res.status === 403) {
      throw Object.assign(new Error('Game API rejected the panel key (check GAME_API_KEY)'), { status: 502 });
    }
    const status = res.status >= 500 ? 502 : res.status;
    throw Object.assign(new Error(msg || `Game server error (${res.status})`), { status });
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
  // Example: pass requestId as the idempotency key so retries don't double-grant.
  // adjustCurrency: (id, body) => call('POST', `/admin/players/${encodeURIComponent(id)}/currency`, body, { idempotencyKey: body.requestId }),
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
