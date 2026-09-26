// MOCK game backend. Everything here is fake data so the panel works without
// the real WildCraft servers. liveAdapter.js has the same functions and is
// where the dev connects the real game.
import { createStore, newId } from '../store.js';

export const SPECIES = ['Wolf', 'Fox', 'Arctic Fox', 'Lynx', 'Tiger', 'Bear', 'Deer', 'Raccoon', 'Horse', 'Dragon'];
const REGIONS = ['EU', 'NA', 'SA', 'ASIA', 'OCE'];
const DEVICES = ['Android', 'iOS'];
const NAME_A = ['Shadow', 'Frost', 'Moon', 'Storm', 'Ember', 'Ash', 'Silver', 'Night', 'Blaze', 'Wild', 'Dusk', 'Mist', 'Thorn', 'Echo', 'Luna', 'Rune'];
const NAME_B = ['fang', 'paw', 'claw', 'tail', 'howl', 'wing', 'heart', 'runner', 'hunter', 'spirit', 'whisker', 'mane'];
const CHAT = [
  'anyone want to join my pack?', 'lol', 'gg', 'where is the boss', 'need help with the quest',
  'nice skin!', 'brb', 'come to the lake', 'who wants to duel', 'my cub is lvl 30 now',
  'selling nothing just vibing', 'how do i get the dragon', 'lag again', 'thanks for the help',
  'you are so bad at this game', 'stop following me', 'report him he is hacking', 'free gems here click link',
];
const REPORT_REASONS = ['Cheating / hacking', 'Harassment', 'Inappropriate name', 'Spam', 'Scam / fake links', 'Griefing'];

export const SKINS = [
  ...SPECIES.flatMap((sp) =>
    ['Classic', 'Midnight', 'Golden', 'Spirit', 'Autumn'].map((v, i) => ({
      id: `${sp.toLowerCase().replace(' ', '_')}_${v.toLowerCase()}`,
      name: `${v} ${sp}`,
      species: sp,
      rarity: ['common', 'rare', 'epic', 'legendary', 'rare'][i],
    })),
  ),
];

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seed() {
  const r = rng(1337);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const now = Date.now();
  const day = 86400000;

  const servers = REGIONS.flatMap((region) =>
    [1, 2, 3].map((n) => ({
      id: `${region.toLowerCase()}-${n}`,
      name: `${region} ${n}`,
      region,
      capacity: 400,
      maintenance: false,
      status: 'online',
      version: '9.2.0',
      startedAt: new Date(now - Math.floor(r() * 5 * day)).toISOString(),
    })),
  );

  const usedNames = new Set();
  const players = [];
  for (let i = 0; i < 600; i++) {
    let username;
    do username = `${pick(NAME_A)}${pick(NAME_B)}${r() < 0.5 ? Math.floor(r() * 999) : ''}`;
    while (usedNames.has(username));
    usedNames.add(username);
    const species = pick(SPECIES);
    const online = r() < 0.25;
    const ownedSkins = SKINS.filter((s) => s.species === species && r() < 0.4).map((s) => s.id);
    players.push({
      id: `p${100000 + i}`,
      username,
      level: 1 + Math.floor(r() * 150),
      species,
      animals: [...new Set([species, pick(SPECIES), pick(SPECIES)])],
      gems: Math.floor(r() * 3000),
      coins: Math.floor(r() * 80000),
      skins: ownedSkins,
      region: pick(REGIONS),
      device: pick(DEVICES),
      online,
      serverId: online ? pick(servers).id : null,
      createdAt: new Date(now - Math.floor(r() * 900 * day)).toISOString(),
      lastSeenAt: new Date(online ? now : now - Math.floor(r() * 60 * day)).toISOString(),
      playtimeHours: Math.floor(r() * 2000),
      packName: r() < 0.4 ? `${pick(NAME_A)} Pack` : null,
      ban: null,
      mute: null,
      warnings: [],
      nameHistory: [],
    });
  }
  // A few already banned / muted
  for (let i = 0; i < 12; i++) {
    const p = pick(players);
    p.ban = { reason: 'Cheating / hacking', by: 'system', at: new Date(now - day).toISOString(), until: r() < 0.5 ? null : new Date(now + 3 * day).toISOString() };
    p.online = false;
    p.serverId = null;
  }
  for (let i = 0; i < 8; i++) {
    pick(players).mute = { reason: 'Spam', by: 'system', at: new Date(now - 3600000).toISOString(), until: new Date(now + 6 * 3600000).toISOString() };
  }

  const chat = [];
  for (let i = 0; i < 1500; i++) {
    const p = pick(players);
    chat.push({
      id: `c${i}`,
      playerId: p.id,
      username: p.username,
      serverId: pick(servers).id,
      channel: r() < 0.7 ? 'global' : r() < 0.5 ? 'pack' : 'private',
      message: pick(CHAT),
      at: new Date(now - Math.floor(r() * 2 * day)).toISOString(),
    });
  }
  chat.sort((a, b) => b.at.localeCompare(a.at));

  const reports = [];
  for (let i = 0; i < 70; i++) {
    const reporter = pick(players);
    const target = pick(players);
    if (reporter === target) continue;
    const evidence = chat.filter((c) => c.playerId === target.id).slice(0, 3);
    reports.push({
      id: `r${1000 + i}`,
      reporterId: reporter.id,
      reporterName: reporter.username,
      targetId: target.id,
      targetName: target.username,
      reason: pick(REPORT_REASONS),
      comment: r() < 0.6 ? pick(['he keeps killing me at spawn', 'teleporting around', 'said bad words', 'posting links', 'rude name', 'please check']) : '',
      serverId: pick(servers).id,
      evidence,
      status: i < 45 ? 'open' : pick(['resolved', 'dismissed']),
      createdAt: new Date(now - Math.floor(r() * 5 * day)).toISOString(),
      handledBy: null,
      handledAt: null,
      note: '',
    });
  }
  reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const onlineHistory = Array.from({ length: 24 }, (_, h) => ({
    at: new Date(now - (23 - h) * 3600000).toISOString(),
    online: Math.round(900 + 700 * Math.sin((h / 24) * Math.PI * 2) + r() * 150),
  }));

  return {
    servers,
    players,
    chat,
    reports,
    transactions: [],
    announcements: [],
    events: [
      { id: 'ev_welcome', name: 'Weekend Double XP', type: 'xp_multiplier', multiplier: 2, startsAt: new Date(now + day).toISOString(), endsAt: new Date(now + 3 * day).toISOString(), enabled: true },
    ],
    promos: [
      { id: 'pr_launch', code: 'WILDSPRING', rewards: { gems: 50, coins: 1000, skinId: null }, maxUses: 1000, uses: 214, expiresAt: new Date(now + 10 * day).toISOString(), enabled: true, createdAt: new Date(now - 5 * day).toISOString() },
    ],
    filterWords: ['badword', 'scamlink.com', 'freegems'],
    onlineHistory,
  };
}

const store = createStore('mockgame', seed);
const db = store.data;
const save = () => store.save();

// ---- helpers ----
const isActive = (x) => Boolean(x) && (x.until == null || new Date(x.until) > new Date());
function withStatus(p) {
  const banned = isActive(p.ban);
  const muted = isActive(p.mute);
  return { ...p, banned, muted, online: p.online && !banned };
}
const notFound = (what) => Object.assign(new Error(`${what} not found`), { status: 404 });
function removeById(list, id, what) {
  const i = list.findIndex((x) => x.id === id);
  if (i < 0) throw notFound(what);
  list.splice(i, 1);
}
function findPlayer(id) {
  const p = db.players.find((x) => x.id === id);
  if (!p) throw Object.assign(new Error('Player not found'), { status: 404 });
  return p;
}
function paginate(list, page = 1, pageSize = 25) {
  page = Math.max(1, Number(page) || 1);
  pageSize = Math.min(100, Math.max(1, Number(pageSize) || 25));
  return { items: list.slice((page - 1) * pageSize, page * pageSize), total: list.length, page, pageSize };
}
function summary(p) {
  const s = withStatus(p);
  return {
    id: s.id, username: s.username, level: s.level, species: s.species, region: s.region,
    online: s.online, banned: s.banned, muted: s.muted, gems: s.gems, coins: s.coins, lastSeenAt: s.lastSeenAt,
  };
}

// ---- adapter API ----
export const mockAdapter = {
  name: 'mock',

  async getStats() {
    const players = db.players.map(withStatus);
    const speciesCount = Object.fromEntries(SPECIES.map((s) => [s, 0]));
    players.forEach((p) => speciesCount[p.species]++);
    const dayAgo = Date.now() - 86400000;
    const onlineNow = players.filter((p) => p.online).length;
    // Scale the fake curve so its last point matches the real current count.
    const last = db.onlineHistory.at(-1).online;
    const onlineHistory = db.onlineHistory.map((h, i, a) => ({
      at: new Date(Date.now() - (a.length - 1 - i) * 3600000).toISOString(),
      online: Math.round((h.online / last) * onlineNow),
    }));
    return {
      onlineNow,
      totalPlayers: players.length,
      activeToday: players.filter((p) => new Date(p.lastSeenAt) > dayAgo).length,
      banned: players.filter((p) => p.banned).length,
      muted: players.filter((p) => p.muted).length,
      openReports: db.reports.filter((r) => r.status === 'open').length,
      serversOnline: db.servers.filter((s) => s.status === 'online').length,
      serversTotal: db.servers.length,
      onlineHistory,
      species: Object.entries(speciesCount).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    };
  },

  // Players
  async listPlayers({ q = '', status = 'all', species = '', page, pageSize }) {
    const needle = q.toLowerCase();
    let list = db.players.map(withStatus).filter((p) => {
      if (needle && !p.username.toLowerCase().includes(needle) && p.id.toLowerCase() !== needle) return false;
      if (species && p.species !== species) return false;
      if (status === 'online' && !p.online) return false;
      if (status === 'banned' && !p.banned) return false;
      if (status === 'muted' && !p.muted) return false;
      return true;
    });
    list.sort((a, b) => Number(b.online) - Number(a.online) || b.lastSeenAt.localeCompare(a.lastSeenAt));
    const res = paginate(list, page, pageSize);
    res.items = res.items.map(summary);
    return res;
  },
  async getPlayer(id) {
    const p = withStatus(findPlayer(id));
    return {
      ...p,
      skins: p.skins.map((sid) => SKINS.find((s) => s.id === sid)).filter(Boolean),
      reportsAgainst: db.reports.filter((r) => r.targetId === id).length,
      transactions: db.transactions.filter((t) => t.playerId === id).slice(0, 20),
    };
  },
  async banPlayer(id, { reason, until, by }) {
    const p = findPlayer(id);
    p.ban = { reason, until, by, at: new Date().toISOString() };
    p.online = false;
    p.serverId = null;
    save();
  },
  async unbanPlayer(id) {
    findPlayer(id).ban = null;
    save();
  },
  async mutePlayer(id, { reason, until, by }) {
    findPlayer(id).mute = { reason, until, by, at: new Date().toISOString() };
    save();
  },
  async unmutePlayer(id) {
    findPlayer(id).mute = null;
    save();
  },
  async kickPlayer(id, { reason, by } = {}) { // reason is shown to the player in game
    const p = findPlayer(id);
    if (!p.online) throw Object.assign(new Error('Player is not online'), { status: 409 });
    p.online = false;
    p.serverId = null;
    save();
  },
  async warnPlayer(id, { message, by }) {
    findPlayer(id).warnings.unshift({ message, by, at: new Date().toISOString() });
    save();
  },
  async renamePlayer(id, { username }) {
    const p = findPlayer(id);
    if (db.players.some((x) => x.username.toLowerCase() === username.toLowerCase() && x.id !== id)) {
      throw Object.assign(new Error('Username already taken'), { status: 409 });
    }
    p.nameHistory.unshift({ from: p.username, to: username, at: new Date().toISOString() });
    p.username = username;
    save();
  },
  async getPlayerChat(id, { limit = 100 } = {}) {
    return db.chat.filter((c) => c.playerId === id).slice(0, limit);
  },

  // Reports
  async listReports({ status = 'open', page, pageSize }) {
    const list = db.reports.filter((r) => status === 'all' || r.status === status);
    return paginate(list, page, pageSize);
  },
  async updateReport(id, { status, note, by }) {
    const r = db.reports.find((x) => x.id === id);
    if (!r) throw Object.assign(new Error('Report not found'), { status: 404 });
    Object.assign(r, { status, note, handledBy: by, handledAt: new Date().toISOString() });
    save();
    return r;
  },

  // Chat
  async searchChat({ q = '', serverId = '', channel = '', page, pageSize }) {
    const needle = q.toLowerCase();
    const list = db.chat.filter(
      (c) =>
        (!needle || c.message.toLowerCase().includes(needle) || c.username.toLowerCase().includes(needle)) &&
        (!serverId || c.serverId === serverId) &&
        (!channel || c.channel === channel),
    );
    return paginate(list, page, pageSize || 50);
  },

  // Economy
  async listSkins() {
    return SKINS;
  },
  async adjustCurrency(id, { currency, amount, reason, by, requestId }) {
    const dup = requestId && db.transactions.find((t) => t.requestId === requestId);
    if (dup) return dup;
    const p = findPlayer(id);
    if (!['gems', 'coins'].includes(currency)) throw Object.assign(new Error('Unknown currency'), { status: 400 });
    const before = p[currency];
    p[currency] = Math.max(0, before + amount);
    const tx = { id: newId('tx'), playerId: id, username: p.username, type: currency, amount: p[currency] - before, balance: p[currency], reason, by, requestId, at: new Date().toISOString() };
    db.transactions.unshift(tx);
    save();
    return tx;
  },
  async setSkin(id, { skinId, give, reason, by, requestId }) {
    const dup = requestId && db.transactions.find((t) => t.requestId === requestId);
    if (dup) return dup;
    const p = findPlayer(id);
    const skin = SKINS.find((s) => s.id === skinId);
    if (!skin) throw Object.assign(new Error('Unknown skin'), { status: 400 });
    const has = p.skins.includes(skinId);
    if (give && has) throw Object.assign(new Error('Player already owns this skin'), { status: 409 });
    if (!give && !has) throw Object.assign(new Error('Player does not own this skin'), { status: 409 });
    p.skins = give ? [...p.skins, skinId] : p.skins.filter((s) => s !== skinId);
    const tx = { id: newId('tx'), playerId: id, username: p.username, type: 'skin', amount: give ? 1 : -1, item: skin.name, reason, by, requestId, at: new Date().toISOString() };
    db.transactions.unshift(tx);
    save();
    return tx;
  },
  async listTransactions({ page, pageSize }) {
    return paginate(db.transactions, page, pageSize);
  },

  // Servers
  async listServers() {
    return db.servers.map((s) => ({
      ...s,
      online: db.players.filter((p) => p.serverId === s.id && !isActive(p.ban)).length,
    }));
  },
  async setMaintenance(id, enabled) {
    const s = db.servers.find((x) => x.id === id);
    if (!s) throw Object.assign(new Error('Server not found'), { status: 404 });
    s.maintenance = enabled;
    s.status = enabled ? 'maintenance' : 'online';
    if (enabled) db.players.forEach((p) => { if (p.serverId === id) { p.online = false; p.serverId = null; } });
    save();
  },
  async restartServer(id) {
    const s = db.servers.find((x) => x.id === id);
    if (!s) throw Object.assign(new Error('Server not found'), { status: 404 });
    s.startedAt = new Date().toISOString();
    save();
  },

  // Announcements
  async listAnnouncements() {
    return db.announcements;
  },
  async createAnnouncement(a) {
    const item = { id: newId('an'), ...a, createdAt: new Date().toISOString() };
    db.announcements.unshift(item);
    save();
    return item;
  },
  async deleteAnnouncement(id) {
    removeById(db.announcements, id, 'Announcement');
    save();
  },

  // Events
  async listEvents() {
    return db.events;
  },
  async saveEvent(ev) {
    if (ev.id) {
      const e = db.events.find((x) => x.id === ev.id);
      if (!e) throw Object.assign(new Error('Event not found'), { status: 404 });
      Object.assign(e, ev);
      save();
      return e;
    }
    const item = { ...ev, id: newId('ev') };
    db.events.unshift(item);
    save();
    return item;
  },
  async deleteEvent(id) {
    removeById(db.events, id, 'Event');
    save();
  },

  // Promo codes
  async listPromos() {
    return db.promos;
  },
  async createPromo(p) {
    if (db.promos.some((x) => x.code === p.code)) throw Object.assign(new Error('Code already exists'), { status: 409 });
    const item = { id: newId('pr'), uses: 0, enabled: true, createdAt: new Date().toISOString(), ...p };
    db.promos.unshift(item);
    save();
    return item;
  },
  async setPromoEnabled(id, enabled) {
    const p = db.promos.find((x) => x.id === id);
    if (!p) throw Object.assign(new Error('Promo not found'), { status: 404 });
    p.enabled = enabled;
    save();
  },
  async deletePromo(id) {
    removeById(db.promos, id, 'Promo');
    save();
  },

  // Chat filter
  async listFilterWords() {
    return db.filterWords;
  },
  async addFilterWord(word) {
    if (!db.filterWords.includes(word)) db.filterWords.push(word);
    save();
  },
  async removeFilterWord(word) {
    if (!db.filterWords.includes(word)) throw notFound('Word');
    db.filterWords = db.filterWords.filter((w) => w !== word);
    save();
  },
};
