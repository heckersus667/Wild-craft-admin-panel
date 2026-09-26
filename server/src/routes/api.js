import express from 'express';
import { game } from '../game/index.js';
import { audit, auditStore } from '../audit.js';
import { admins, login, logout, requireAuth, requirePerm as perm, publicAdmin, hashPassword, checkPassword } from '../auth.js';
import { can, ROLE_NAMES } from '../permissions.js';
import { newId } from '../store.js';
import { str, int, date, bool, oneOf, password, qstr, paging, BadRequest } from '../validate.js';

const r = express.Router();
// Wrap async handlers so thrown errors reach the error handler.
const h = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const hoursFromNow = (hrs) => (hrs == null ? null : new Date(Date.now() + hrs * 3600000).toISOString());
const MOD_MAX_BAN_HOURS = 168;
const isActive = (x) => x && (x.until == null || new Date(x.until) > new Date());
// Moderators may only create, replace or lift bans that are at most 7 days
// long. Anything longer (or permanent: until == null) is admin-only.
function modMayTouchBan(ban) {
  if (!isActive(ban)) return true;
  if (ban.until == null) return false;
  return new Date(ban.until) - Date.now() <= MOD_MAX_BAN_HOURS * 3600000;
}

// ---------- auth ----------
r.post('/auth/login', h(login));
r.post('/auth/logout', logout);
r.use(requireAuth);
r.get('/auth/me', (req, res) => res.json({ admin: publicAdmin(req.admin), adapter: game.name }));
r.post('/auth/password', h(async (req, res) => {
  const current = password(req.body.current, 'Current password', 1);
  const next = password(req.body.next, 'New password');
  if (!(await checkPassword(req, req.admin, current))) throw new BadRequest('Current password is wrong');
  req.admin.passwordHash = await hashPassword(next);
  req.admin.tokenVersion++;
  admins.flush();
  audit(req, 'admin.password_change', req.admin.username);
  res.clearCookie('wc_admin');
  res.json({ ok: true });
}));

// ---------- dashboard ----------
r.get('/dashboard', perm('dashboard.view'), h(async (req, res) => {
  const recentActions = can(req.admin.role, 'audit.view') ? auditStore.data.list.slice(0, 10) : null;
  res.json({ stats: await game.getStats(), recentActions });
}));

// ---------- players ----------
r.get('/players', perm('players.view'), h(async (req, res) => {
  const { q, status, species } = req.query;
  res.json(await game.listPlayers({ q: qstr(q).trim(), status: qstr(status) || 'all', species: qstr(species), ...paging(req.query) }));
}));
// Fill in defaults so a partial response from the live game can't break the page.
function normalizePlayer(p) {
  const ban = p.ban || null;
  const mute = p.mute || null;
  return {
    animals: [], skins: [], warnings: [], nameHistory: [], transactions: [], reportsAgainst: 0,
    gems: 0, coins: 0, level: 0, playtimeHours: 0,
    ...p,
    ban, mute,
    banned: p.banned ?? isActive(ban),
    muted: p.muted ?? isActive(mute),
    online: Boolean(p.online) && !(p.banned ?? isActive(ban)),
  };
}
r.get('/players/:id', perm('players.view'), h(async (req, res) => {
  res.json(normalizePlayer(await game.getPlayer(req.params.id)));
}));
r.get('/players/:id/chat', perm('chat.view'), h(async (req, res) => {
  res.json(await game.getPlayerChat(req.params.id));
}));
r.post('/players/:id/ban', perm('players.moderate'), h(async (req, res) => {
  const reason = str(req.body.reason, 'Reason', { max: 300 });
  const hours = int(req.body.hours, 'Duration', { min: 1, max: 24 * 365 * 10, optional: true });
  // Moderators: temp bans up to 7 days only.
  if (!can(req.admin.role, 'players.ban')) {
    if (hours == null || hours > MOD_MAX_BAN_HOURS) return res.status(403).json({ error: 'Moderators can only ban for up to 7 days' });
    const { ban } = await game.getPlayer(req.params.id);
    if (!modMayTouchBan(ban)) return res.status(403).json({ error: 'This player has a longer ban. Only admins can change it.' });
  }
  await game.banPlayer(req.params.id, { reason, until: hoursFromNow(hours), by: req.admin.username });
  audit(req, 'player.ban', req.params.id, { reason, hours: hours ?? 'permanent' });
  res.json({ ok: true });
}));
r.post('/players/:id/unban', perm('players.moderate'), h(async (req, res) => {
  const { ban } = await game.getPlayer(req.params.id);
  if (!can(req.admin.role, 'players.ban') && !modMayTouchBan(ban)) {
    return res.status(403).json({ error: 'Only admins can lift permanent or long bans' });
  }
  await game.unbanPlayer(req.params.id);
  audit(req, 'player.unban', req.params.id);
  res.json({ ok: true });
}));
r.post('/players/:id/mute', perm('players.moderate'), h(async (req, res) => {
  const reason = str(req.body.reason, 'Reason', { max: 300 });
  const minutes = int(req.body.minutes, 'Duration', { min: 1, max: 60 * 24 * 30 });
  await game.mutePlayer(req.params.id, { reason, until: new Date(Date.now() + minutes * 60000).toISOString(), by: req.admin.username });
  audit(req, 'player.mute', req.params.id, { reason, minutes });
  res.json({ ok: true });
}));
r.post('/players/:id/unmute', perm('players.moderate'), h(async (req, res) => {
  await game.unmutePlayer(req.params.id);
  audit(req, 'player.unmute', req.params.id);
  res.json({ ok: true });
}));
r.post('/players/:id/kick', perm('players.moderate'), h(async (req, res) => {
  const reason = str(req.body.reason, 'Reason', { max: 300, optional: true });
  await game.kickPlayer(req.params.id, { reason, by: req.admin.username });
  audit(req, 'player.kick', req.params.id, { reason });
  res.json({ ok: true });
}));
r.post('/players/:id/warn', perm('players.moderate'), h(async (req, res) => {
  const message = str(req.body.message, 'Message', { max: 300 });
  await game.warnPlayer(req.params.id, { message, by: req.admin.username });
  audit(req, 'player.warn', req.params.id, { message });
  res.json({ ok: true });
}));
r.post('/players/:id/rename', perm('players.ban'), h(async (req, res) => {
  const username = str(req.body.username, 'Username', { min: 3, max: 20 });
  if (!/^[A-Za-z0-9_]+$/.test(username)) throw new BadRequest('Username can only contain letters, numbers and _');
  await game.renamePlayer(req.params.id, { username });
  audit(req, 'player.rename', req.params.id, { username });
  res.json({ ok: true });
}));

// ---------- reports ----------
r.get('/reports', perm('reports.view'), h(async (req, res) => {
  res.json(await game.listReports({ status: qstr(req.query.status) || 'open', ...paging(req.query) }));
}));
r.post('/reports/:id', perm('reports.handle'), h(async (req, res) => {
  const status = oneOf(req.body.status, 'Status', ['open', 'resolved', 'dismissed']);
  const note = str(req.body.note, 'Note', { max: 500, optional: true });
  const report = await game.updateReport(req.params.id, { status, note, by: req.admin.username });
  audit(req, `report.${status}`, req.params.id, { note });
  res.json(report);
}));

// ---------- chat ----------
r.get('/chat', perm('chat.view'), h(async (req, res) => {
  const { q, serverId, channel } = req.query;
  res.json(await game.searchChat({ q: qstr(q).trim(), serverId: qstr(serverId), channel: qstr(channel), ...paging(req.query, 50) }));
}));
r.get('/filter', perm('filter.view'), h(async (_req, res) => res.json(await game.listFilterWords())));
r.post('/filter', perm('filter.manage'), h(async (req, res) => {
  const word = str(req.body.word, 'Word', { max: 100 }).toLowerCase();
  await game.addFilterWord(word);
  audit(req, 'filter.add', word);
  res.json({ ok: true });
}));
r.delete('/filter/:word', perm('filter.manage'), h(async (req, res) => {
  await game.removeFilterWord(req.params.word);
  audit(req, 'filter.remove', req.params.word);
  res.json({ ok: true });
}));

// ---------- economy ----------
r.get('/economy/skins', perm('economy.view'), h(async (_req, res) => res.json(await game.listSkins())));
r.get('/economy/transactions', perm('economy.view'), h(async (req, res) => {
  res.json(await game.listTransactions(paging(req.query)));
}));
r.post('/economy/currency', perm('economy.grant'), h(async (req, res) => {
  const playerId = str(req.body.playerId, 'Player ID', { max: 64 });
  const currency = oneOf(req.body.currency, 'Currency', ['gems', 'coins']);
  const amount = int(req.body.amount, 'Amount', { min: -1_000_000, max: 1_000_000 });
  if (amount === 0) throw new BadRequest('Amount cannot be 0');
  const reason = str(req.body.reason, 'Reason', { max: 300 });
  const requestId = newId('req');
  const tx = await game.adjustCurrency(playerId, { currency, amount, reason, by: req.admin.username, requestId });
  audit(req, amount > 0 ? 'economy.grant' : 'economy.remove', playerId, { currency, requested: amount, applied: tx.amount, reason, requestId });
  res.json(tx);
}));
r.post('/economy/skin', perm('economy.grant'), h(async (req, res) => {
  const playerId = str(req.body.playerId, 'Player ID', { max: 64 });
  const skinId = str(req.body.skinId, 'Skin', { max: 100 });
  const give = bool(req.body.give, 'give');
  const reason = str(req.body.reason, 'Reason', { max: 300 });
  const requestId = newId('req');
  const tx = await game.setSkin(playerId, { skinId, give, reason, by: req.admin.username, requestId });
  audit(req, give ? 'economy.skin_give' : 'economy.skin_remove', playerId, { skinId, reason, requestId });
  res.json(tx);
}));

// ---------- servers ----------
r.get('/servers', perm('servers.view'), h(async (_req, res) => res.json(await game.listServers())));
r.post('/servers/:id/maintenance', perm('servers.manage'), h(async (req, res) => {
  const enabled = bool(req.body.enabled, 'enabled');
  await game.setMaintenance(req.params.id, enabled);
  audit(req, enabled ? 'server.maintenance_on' : 'server.maintenance_off', req.params.id);
  res.json({ ok: true });
}));
r.post('/servers/:id/restart', perm('servers.manage'), h(async (req, res) => {
  await game.restartServer(req.params.id);
  audit(req, 'server.restart', req.params.id);
  res.json({ ok: true });
}));

// ---------- announcements ----------
r.get('/announcements', perm('announcements.manage'), h(async (_req, res) => res.json(await game.listAnnouncements())));
r.post('/announcements', perm('announcements.manage'), h(async (req, res) => {
  const item = await game.createAnnouncement({
    title: str(req.body.title, 'Title', { max: 80 }),
    message: str(req.body.message, 'Message', { max: 500 }),
    target: str(req.body.target, 'Target', { max: 40, optional: true }) || 'all',
    style: oneOf(req.body.style || 'info', 'Style', ['info', 'warning', 'event']),
    expiresAt: date(req.body.expiresAt, 'Expires', { optional: true }),
    by: req.admin.username,
  });
  audit(req, 'announcement.create', item.id, { title: item.title, target: item.target });
  res.json(item);
}));
r.delete('/announcements/:id', perm('announcements.manage'), h(async (req, res) => {
  await game.deleteAnnouncement(req.params.id);
  audit(req, 'announcement.delete', req.params.id);
  res.json({ ok: true });
}));

// ---------- events ----------
const EVENT_TYPES = ['xp_multiplier', 'coin_multiplier', 'gem_sale', 'boss_spawn', 'custom'];
function readEvent(body) {
  const ev = {
    name: str(body.name, 'Name', { max: 80 }),
    type: oneOf(body.type, 'Type', EVENT_TYPES),
    multiplier: body.multiplier === '' || body.multiplier == null ? null : Number(body.multiplier),
    startsAt: date(body.startsAt, 'Start'),
    endsAt: date(body.endsAt, 'End'),
    enabled: body.enabled === undefined ? true : bool(body.enabled, 'enabled'),
    description: str(body.description, 'Description', { max: 300, optional: true }),
  };
  if (ev.multiplier !== null && !(ev.multiplier > 0 && ev.multiplier <= 10)) throw new BadRequest('Multiplier must be between 0 and 10');
  if (Date.parse(ev.endsAt) <= Date.parse(ev.startsAt)) throw new BadRequest('End must be after start');
  return ev;
}
r.get('/events', perm('events.manage'), h(async (_req, res) => res.json(await game.listEvents())));
r.post('/events', perm('events.manage'), h(async (req, res) => {
  const ev = await game.saveEvent(readEvent(req.body));
  audit(req, 'event.create', ev.id, { name: ev.name });
  res.json(ev);
}));
r.put('/events/:id', perm('events.manage'), h(async (req, res) => {
  const ev = await game.saveEvent({ ...readEvent(req.body), id: req.params.id });
  audit(req, 'event.update', ev.id, { name: ev.name, enabled: ev.enabled });
  res.json(ev);
}));
r.delete('/events/:id', perm('events.manage'), h(async (req, res) => {
  await game.deleteEvent(req.params.id);
  audit(req, 'event.delete', req.params.id);
  res.json({ ok: true });
}));

// ---------- promo codes ----------
r.get('/promos', perm('promos.manage'), h(async (_req, res) => res.json(await game.listPromos())));
r.post('/promos', perm('promos.manage'), h(async (req, res) => {
  const code = str(req.body.code, 'Code', { min: 4, max: 24 }).toUpperCase();
  if (!/^[A-Z0-9]+$/.test(code)) throw new BadRequest('Code can only contain letters and numbers');
  const promo = await game.createPromo({
    code,
    rewards: {
      gems: int(req.body.gems, 'Gems', { min: 0, max: 100000, optional: true }) || 0,
      coins: int(req.body.coins, 'Coins', { min: 0, max: 10_000_000, optional: true }) || 0,
      skinId: str(req.body.skinId, 'Skin', { max: 100, optional: true }) || null,
    },
    maxUses: int(req.body.maxUses, 'Max uses', { min: 1, max: 10_000_000 }),
    expiresAt: date(req.body.expiresAt, 'Expires', { optional: true }),
  });
  audit(req, 'promo.create', code, promo.rewards);
  res.json(promo);
}));
r.post('/promos/:id/enabled', perm('promos.manage'), h(async (req, res) => {
  const enabled = bool(req.body.enabled, 'enabled');
  await game.setPromoEnabled(req.params.id, enabled);
  audit(req, enabled ? 'promo.enable' : 'promo.disable', req.params.id);
  res.json({ ok: true });
}));
r.delete('/promos/:id', perm('promos.manage'), h(async (req, res) => {
  await game.deletePromo(req.params.id);
  audit(req, 'promo.delete', req.params.id);
  res.json({ ok: true });
}));

// ---------- audit log ----------
r.get('/audit', perm('audit.view'), (req, res) => {
  const q = qstr(req.query.q).toLowerCase();
  const list = auditStore.data.list.filter(
    (e) => !q || e.action.includes(q) || (e.admin || '').toLowerCase().includes(q) || String(e.target).toLowerCase().includes(q),
  );
  const page = Math.max(1, Number(req.query.page) || 1);
  res.json({ items: list.slice((page - 1) * 50, page * 50), total: list.length, page, pageSize: 50 });
});

// ---------- panel admins ----------
r.get('/admins', perm('admins.manage'), (_req, res) => res.json(admins.data.list.map(publicAdmin)));
r.post('/admins', perm('admins.manage'), h(async (req, res) => {
  const username = str(req.body.username, 'Username', { min: 3, max: 32 });
  const pw = password(req.body.password, 'Password');
  const role = oneOf(req.body.role, 'Role', ROLE_NAMES);
  if (admins.data.list.some((a) => a.username.toLowerCase() === username.toLowerCase())) throw new BadRequest('Username already exists');
  const a = { id: newId('adm'), username, passwordHash: await hashPassword(pw), role, disabled: false, createdAt: new Date().toISOString(), lastLoginAt: null, tokenVersion: 0 };
  admins.data.list.push(a);
  admins.flush();
  audit(req, 'admin.create', username, { role });
  res.json(publicAdmin(a));
}));
r.patch('/admins/:id', perm('admins.manage'), h(async (req, res) => {
  const a = admins.data.list.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Admin not found' });
  const changes = {};
  if (req.body.role !== undefined) changes.role = oneOf(req.body.role, 'Role', ROLE_NAMES);
  if (req.body.disabled !== undefined) changes.disabled = bool(req.body.disabled, 'disabled');
  if (req.body.password) changes.passwordHash = await hashPassword(password(req.body.password, 'Password'));

  const owners = admins.data.list.filter((x) => x.role === 'owner' && !x.disabled);
  const activeOwner = a.role === 'owner' && !a.disabled;
  const losesOwner = activeOwner && ((changes.role && changes.role !== 'owner') || changes.disabled);
  if (losesOwner && owners.length <= 1) throw new BadRequest('There must be at least one active owner');

  Object.assign(a, changes);
  a.tokenVersion++; // force re-login after any change
  admins.flush();
  audit(req, 'admin.update', a.username, { role: changes.role, disabled: changes.disabled, passwordReset: Boolean(changes.passwordHash) });
  res.json(publicAdmin(a));
}));
r.delete('/admins/:id', perm('admins.manage'), (req, res) => {
  const a = admins.data.list.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Admin not found' });
  if (a.id === req.admin.id) return res.status(400).json({ error: "You can't delete yourself" });
  if (a.role === 'owner' && !a.disabled && admins.data.list.filter((x) => x.role === 'owner' && !x.disabled).length <= 1) {
    return res.status(400).json({ error: 'There must be at least one active owner' });
  }
  admins.data.list = admins.data.list.filter((x) => x.id !== a.id);
  admins.flush();
  audit(req, 'admin.delete', a.username);
  res.json({ ok: true });
});

export default r;
