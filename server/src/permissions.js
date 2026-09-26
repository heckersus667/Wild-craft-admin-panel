// Role -> permission list. Higher roles include everything below them.
const moderator = [
  'dashboard.view',
  'players.view',
  'players.moderate', // warn, mute, kick, temp ban (max 7 days)
  'reports.view',
  'reports.handle',
  'chat.view',
  'filter.view',
];
const admin = [
  ...moderator,
  'players.ban', // permanent bans, rename, unban anyone
  'economy.view',
  'economy.grant',
  'servers.view',
  'servers.manage',
  'announcements.manage',
  'events.manage',
  'promos.manage',
  'filter.manage',
  'audit.view',
];
const owner = [...admin, 'admins.manage'];

export const ROLES = { moderator, admin, owner };
export const ROLE_NAMES = Object.keys(ROLES);
export const can = (role, perm) => (ROLES[role] || []).includes(perm);
