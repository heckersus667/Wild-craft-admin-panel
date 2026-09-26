// Demo build only: answers the panel's API calls inside the browser using the
// same mock game adapter and permission rules as the real server.
import { mockAdapter as game } from '../../../server/src/game/mockAdapter.js';
import { ROLES, can } from '../../../server/src/permissions.js';
import { str, int, bool, date, oneOf, qstr, paging, BadRequest } from '../../../server/src/validate.js';
import { newId } from './memStore.js';

const ACCOUNTS = {
  owner: { id: 'adm_owner', username: 'owner', role: 'owner' },
  admin: { id: 'adm_admin', username: 'admin', role: 'admin' },
  moderator: { id: 'adm_mod', username: 'moderator', role: 'moderator' },
};
let session = null;
const auditLog = [];
const pub = (a) => ({ ...a, disabled: false, createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString(), permissions: ROLES[a.role] });
const fail = (status, error) => Object.assign(new Error(error), { status });
const audit = (action, target, details = {}) =>
  auditLog.unshift({ id: newId('log'), at: new Date().toISOString(), adminId: session.id, admin: session.username, action, target, details, ip: 'demo' });
const need = (perm) => { if (!can(session.role, perm)) throw fail(403, `Missing permission: ${perm}`); };
const isActive = (x) => Boolean(x) && (x.until == null || new Date(x.until) > new Date());
const modMayTouchBan = (ban) => !isActive(ban) || (ban.until != null && new Date(ban.until) - Date.now() <= 168 * 3600000);
const hoursFromNow = (h) => (h == null ? null : new Date(Date.now() + h * 3600000).toISOString());

const routes = [
  ['POST', '/auth/login', async (_m, b) => {
    const a = ACCOUNTS[String(b.username).toLowerCase()];
    if (!a || b.password !== 'demo') throw fail(401, 'Demo logins: owner, admin or moderator, password "demo"');
    session = a;
    audit('auth.login', a.username);
    return { admin: pub(a) };
  }],
  ['POST', '/auth/logout', async () => { session = null; return { ok: true }; }],
  ['GET', '/auth/me', async () => ({ admin: pub(session), adapter: 'mock' })],
  ['POST', '/auth/password', async () => { throw fail(400, 'Password changes are disabled in the demo'); }],
  ['GET', '/dashboard', async () => { need('dashboard.view'); return { stats: await game.getStats(), recentActions: can(session.role, 'audit.view') ? auditLog.slice(0, 10) : null }; }],
  ['GET', '/players', async (_m, _b, q) => { need('players.view'); return game.listPlayers({ q: qstr(q.q).trim(), status: qstr(q.status) || 'all', species: qstr(q.species), ...paging(q) }); }],
  ['GET', /^\/players\/([^/]+)$/, async (m) => { need('players.view'); return game.getPlayer(m[1]); }],
  ['GET', /^\/players\/([^/]+)\/chat$/, async (m) => { need('chat.view'); return game.getPlayerChat(m[1]); }],
  ['POST', /^\/players\/([^/]+)\/ban$/, async (m, b) => {
    need('players.moderate');
    const reason = str(b.reason, 'Reason', { max: 300 });
    const hours = int(b.hours, 'Duration', { min: 1, max: 87600, optional: true });
    if (!can(session.role, 'players.ban')) {
      if (hours == null || hours > 168) throw fail(403, 'Moderators can only ban for up to 7 days');
      if (!modMayTouchBan((await game.getPlayer(m[1])).ban)) throw fail(403, 'This player has a longer ban. Only admins can change it.');
    }
    await game.banPlayer(m[1], { reason, until: hoursFromNow(hours), by: session.username });
    audit('player.ban', m[1], { reason, hours: hours ?? 'permanent' });
    return { ok: true };
  }],
  ['POST', /^\/players\/([^/]+)\/unban$/, async (m) => {
    need('players.moderate');
    if (!can(session.role, 'players.ban') && !modMayTouchBan((await game.getPlayer(m[1])).ban)) throw fail(403, 'Only admins can lift permanent or long bans');
    await game.unbanPlayer(m[1]); audit('player.unban', m[1]); return { ok: true };
  }],
  ['POST', /^\/players\/([^/]+)\/mute$/, async (m, b) => {
    need('players.moderate');
    const reason = str(b.reason, 'Reason'); const minutes = int(b.minutes, 'Duration', { min: 1, max: 43200 });
    await game.mutePlayer(m[1], { reason, until: new Date(Date.now() + minutes * 60000).toISOString(), by: session.username });
    audit('player.mute', m[1], { reason, minutes }); return { ok: true };
  }],
  ['POST', /^\/players\/([^/]+)\/unmute$/, async (m) => { need('players.moderate'); await game.unmutePlayer(m[1]); audit('player.unmute', m[1]); return { ok: true }; }],
  ['POST', /^\/players\/([^/]+)\/kick$/, async (m, b) => { need('players.moderate'); await game.kickPlayer(m[1], { reason: b.reason, by: session.username }); audit('player.kick', m[1], { reason: b.reason }); return { ok: true }; }],
  ['POST', /^\/players\/([^/]+)\/warn$/, async (m, b) => { need('players.moderate'); const message = str(b.message, 'Message'); await game.warnPlayer(m[1], { message, by: session.username }); audit('player.warn', m[1], { message }); return { ok: true }; }],
  ['POST', /^\/players\/([^/]+)\/rename$/, async (m, b) => {
    need('players.ban');
    const username = str(b.username, 'Username', { min: 3, max: 20 });
    if (!/^[A-Za-z0-9_]+$/.test(username)) throw new BadRequest('Username can only contain letters, numbers and _');
    await game.renamePlayer(m[1], { username }); audit('player.rename', m[1], { username }); return { ok: true };
  }],
  ['GET', '/reports', async (_m, _b, q) => { need('reports.view'); return game.listReports({ status: qstr(q.status) || 'open', ...paging(q) }); }],
  ['POST', /^\/reports\/([^/]+)$/, async (m, b) => {
    need('reports.handle');
    const status = oneOf(b.status, 'Status', ['open', 'resolved', 'dismissed']);
    const r = await game.updateReport(m[1], { status, note: b.note || '', by: session.username });
    audit(`report.${status}`, m[1], { note: b.note }); return r;
  }],
  ['GET', '/chat', async (_m, _b, q) => { need('chat.view'); return game.searchChat({ q: qstr(q.q).trim(), serverId: qstr(q.serverId), channel: qstr(q.channel), ...paging(q, 50) }); }],
  ['GET', '/filter', async () => { need('filter.view'); return game.listFilterWords(); }],
  ['POST', '/filter', async (_m, b) => { need('filter.manage'); const w = str(b.word, 'Word', { max: 100 }).toLowerCase(); await game.addFilterWord(w); audit('filter.add', w); return { ok: true }; }],
  ['DELETE', /^\/filter\/(.+)$/, async (m) => { need('filter.manage'); const w = decodeURIComponent(m[1]); await game.removeFilterWord(w); audit('filter.remove', w); return { ok: true }; }],
  ['GET', '/economy/skins', async () => { need('economy.view'); return game.listSkins(); }],
  ['GET', '/economy/transactions', async (_m, _b, q) => { need('economy.view'); return game.listTransactions(paging(q)); }],
  ['POST', '/economy/currency', async (_m, b) => {
    need('economy.grant');
    const currency = oneOf(b.currency, 'Currency', ['gems', 'coins']);
    const amount = int(b.amount, 'Amount', { min: -1e6, max: 1e6 });
    if (amount === 0) throw new BadRequest('Amount cannot be 0');
    const reason = str(b.reason, 'Reason');
    const tx = await game.adjustCurrency(str(b.playerId, 'Player ID'), { currency, amount, reason, by: session.username, requestId: newId('req') });
    audit(amount > 0 ? 'economy.grant' : 'economy.remove', b.playerId, { currency, applied: tx.amount, reason }); return tx;
  }],
  ['POST', '/economy/skin', async (_m, b) => {
    need('economy.grant');
    const give = bool(b.give, 'give'); const reason = str(b.reason, 'Reason');
    const tx = await game.setSkin(str(b.playerId, 'Player ID'), { skinId: b.skinId, give, reason, by: session.username, requestId: newId('req') });
    audit(give ? 'economy.skin_give' : 'economy.skin_remove', b.playerId, { skinId: b.skinId, reason }); return tx;
  }],
  ['GET', '/servers', async () => { need('servers.view'); return game.listServers(); }],
  ['POST', /^\/servers\/([^/]+)\/maintenance$/, async (m, b) => { need('servers.manage'); const on = bool(b.enabled, 'enabled'); await game.setMaintenance(m[1], on); audit(on ? 'server.maintenance_on' : 'server.maintenance_off', m[1]); return { ok: true }; }],
  ['POST', /^\/servers\/([^/]+)\/restart$/, async (m) => { need('servers.manage'); await game.restartServer(m[1]); audit('server.restart', m[1]); return { ok: true }; }],
  ['GET', '/announcements', async () => { need('announcements.manage'); return game.listAnnouncements(); }],
  ['POST', '/announcements', async (_m, b) => {
    need('announcements.manage');
    const a = await game.createAnnouncement({ title: str(b.title, 'Title', { max: 80 }), message: str(b.message, 'Message'), target: b.target || 'all', style: b.style || 'info', expiresAt: date(b.expiresAt, 'Expires', { optional: true }), by: session.username });
    audit('announcement.create', a.id, { title: a.title }); return a;
  }],
  ['DELETE', /^\/announcements\/(.+)$/, async (m) => { need('announcements.manage'); await game.deleteAnnouncement(m[1]); audit('announcement.delete', m[1]); return { ok: true }; }],
  ['GET', '/events', async () => { need('events.manage'); return game.listEvents(); }],
  ['POST', '/events', async (_m, b) => { need('events.manage'); const e = await game.saveEvent(readEvent(b)); audit('event.create', e.id, { name: e.name }); return e; }],
  ['PUT', /^\/events\/(.+)$/, async (m, b) => { need('events.manage'); const e = await game.saveEvent({ ...readEvent(b), id: m[1] }); audit('event.update', e.id, { name: e.name }); return e; }],
  ['DELETE', /^\/events\/(.+)$/, async (m) => { need('events.manage'); await game.deleteEvent(m[1]); audit('event.delete', m[1]); return { ok: true }; }],
  ['GET', '/promos', async () => { need('promos.manage'); return game.listPromos(); }],
  ['POST', '/promos', async (_m, b) => {
    need('promos.manage');
    const code = str(b.code, 'Code', { min: 4, max: 24 }).toUpperCase();
    if (!/^[A-Z0-9]+$/.test(code)) throw new BadRequest('Code can only contain letters and numbers');
    const p = await game.createPromo({ code, rewards: { gems: int(b.gems, 'Gems', { min: 0, optional: true }) || 0, coins: int(b.coins, 'Coins', { min: 0, optional: true }) || 0, skinId: b.skinId || null }, maxUses: int(b.maxUses, 'Max uses', { min: 1 }), expiresAt: date(b.expiresAt, 'Expires', { optional: true }) });
    audit('promo.create', code, p.rewards); return p;
  }],
  ['POST', /^\/promos\/([^/]+)\/enabled$/, async (m, b) => { need('promos.manage'); const on = bool(b.enabled, 'enabled'); await game.setPromoEnabled(m[1], on); audit(on ? 'promo.enable' : 'promo.disable', m[1]); return { ok: true }; }],
  ['DELETE', /^\/promos\/(.+)$/, async (m) => { need('promos.manage'); await game.deletePromo(m[1]); audit('promo.delete', m[1]); return { ok: true }; }],
  ['GET', '/audit', async (_m, _b, q) => {
    need('audit.view');
    const f = qstr(q.q).toLowerCase();
    const list = auditLog.filter((e) => !f || e.action.includes(f) || e.admin.includes(f) || String(e.target).toLowerCase().includes(f));
    const page = Math.max(1, Number(q.page) || 1);
    return { items: list.slice((page - 1) * 50, page * 50), total: list.length, page, pageSize: 50 };
  }],
  ['GET', '/admins', async () => { need('admins.manage'); return Object.values(ACCOUNTS).map(pub); }],
  ['POST', '/admins', async () => { throw fail(400, 'Staff accounts are fixed in the demo'); }],
  ['PATCH', /^\/admins\/.+$/, async () => { throw fail(400, 'Staff accounts are fixed in the demo'); }],
  ['DELETE', /^\/admins\/.+$/, async () => { throw fail(400, 'Staff accounts are fixed in the demo'); }],
];

function readEvent(b) {
  const ev = { name: str(b.name, 'Name', { max: 80 }), type: b.type, multiplier: b.multiplier === '' || b.multiplier == null ? null : Number(b.multiplier), startsAt: date(b.startsAt, 'Start'), endsAt: date(b.endsAt, 'End'), enabled: b.enabled !== false, description: b.description || '' };
  if (ev.multiplier !== null && !(ev.multiplier > 0 && ev.multiplier <= 10)) throw new BadRequest('Multiplier must be between 0 and 10');
  if (Date.parse(ev.endsAt) <= Date.parse(ev.startsAt)) throw new BadRequest('End must be after start');
  return ev;
}

export async function demoApi(fullPath, { method = 'GET', body } = {}) {
  await new Promise((r) => setTimeout(r, 120)); // feel like a network call
  const [path, search = ''] = fullPath.split('?');
  const query = Object.fromEntries(new URLSearchParams(search));
  for (const [m, p, fn] of routes) {
    if (m !== method) continue;
    const match = typeof p === 'string' ? (p === path ? [path] : null) : path.match(p);
    if (!match) continue;
    if (!session && path !== '/auth/login') throw fail(401, 'Not logged in');
    try {
      return structuredClone(await fn(match, body || {}, query));
    } catch (e) {
      throw fail(e.status || 500, e.message);
    }
  }
  throw fail(404, 'Not found');
}
