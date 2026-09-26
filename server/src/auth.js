import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createStore, newId } from './store.js';
import { ROLES } from './permissions.js';
import { audit } from './audit.js';

const COOKIE = 'wc_admin';
const SESSION_HOURS = 12;
const PROD = process.env.NODE_ENV === 'production';

if (PROD && (process.env.JWT_SECRET || '').length < 32) {
  console.error('[auth] JWT_SECRET must be set to at least 32 characters in production.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET not set: using a random one. Sessions end when the server restarts.');
}

export const admins = createStore('admins', () => ({ list: [] }));

// Create the first owner account if none exist.
if (admins.data.list.length === 0) {
  const username = process.env.ADMIN_USERNAME || 'owner';
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  admins.data.list.push({
    id: newId('adm'),
    username,
    passwordHash: bcrypt.hashSync(password, 12),
    role: 'owner',
    disabled: false,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    tokenVersion: 0,
  });
  admins.flush();
  console.log('\n==============================================');
  console.log(' First owner account created');
  console.log(`   username: ${username}`);
  if (!process.env.ADMIN_PASSWORD) console.log(`   password: ${password}`);
  else console.log(' You can now remove ADMIN_PASSWORD from .env.');
  console.log(' Change the password after logging in.');
  console.log('==============================================\n');
}

export const publicAdmin = (a) => ({
  id: a.id,
  username: a.username,
  role: a.role,
  disabled: a.disabled,
  createdAt: a.createdAt,
  lastLoginAt: a.lastLoginAt,
  permissions: ROLES[a.role] || [],
});

// ---- brute-force protection ----
// Attempts are counted BEFORE checking the password, so parallel requests
// can't slip past the limit.
const WINDOW = 15 * 60 * 1000;
const LIMITS = { ip: 5, user: 20 }; // per username+IP, and per username from anywhere
const attempts = new Map();
const MAX_KEYS = 100_000;

function hit(key) {
  const now = Date.now();
  let a = attempts.get(key);
  if (!a || now - a.first > WINDOW) {
    if (attempts.size >= MAX_KEYS) attempts.delete(attempts.keys().next().value);
    a = { first: now, count: 0 };
    attempts.set(key, a);
  }
  return ++a.count;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, a] of attempts) if (now - a.first > WINDOW) attempts.delete(k);
}, 60_000).unref();

// Keeps timing the same whether or not the username exists.
const DUMMY_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), 12);

export async function login(req, res) {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || username.length > 64 || password.length > 200) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const name = username.toLowerCase();
  const perIp = hit(`ip|${name}|${req.ip}`);
  const perUser = hit(`user|${name}`);
  if (perIp > LIMITS.ip || perUser > LIMITS.user) {
    return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
  }

  const admin = admins.data.list.find((a) => a.username.toLowerCase() === name);
  const match = await bcrypt.compare(password, admin ? admin.passwordHash : DUMMY_HASH);
  if (!admin || admin.disabled || !match) {
    if (admin) audit(req, 'auth.login_failed', admin.username, {}, admin);
    return res.status(401).json({ error: 'Wrong username or password' });
  }
  attempts.delete(`ip|${name}|${req.ip}`);
  admin.lastLoginAt = new Date().toISOString();
  admins.flush();
  audit(req, 'auth.login', admin.username, {}, admin);

  const token = jwt.sign({ sub: admin.id, v: admin.tokenVersion }, JWT_SECRET, {
    expiresIn: `${SESSION_HOURS}h`,
  });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: PROD,
    maxAge: SESSION_HOURS * 3600 * 1000,
  });
  res.json({ admin: publicAdmin(admin) });
}

function sessionAdmin(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const admin = admins.data.list.find((a) => a.id === payload.sub);
    if (!admin || admin.disabled || admin.tokenVersion !== payload.v) return null;
    return admin;
  } catch {
    return null;
  }
}

// Logging out ends every session of this admin, so a copied cookie stops working too.
export function logout(req, res) {
  const admin = sessionAdmin(req);
  if (admin) {
    admin.tokenVersion++;
    admins.flush();
  }
  res.clearCookie(COOKIE);
  res.json({ ok: true });
}

export function requireAuth(req, res, next) {
  const admin = sessionAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Not logged in' });
  req.admin = admin;
  next();
}

export const requirePerm = (perm) => (req, res, next) =>
  (ROLES[req.admin.role] || []).includes(perm) ? next() : res.status(403).json({ error: `Missing permission: ${perm}` });

// Reject cross-site form posts; the SPA always sends this header.
export function requireCsrfHeader(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'wildcraft-admin') {
    return res.status(403).json({ error: 'Bad request origin' });
  }
  next();
}

export async function hashPassword(pw) {
  return bcrypt.hash(pw, 12);
}

// Current-password check for password changes, rate limited like login.
export async function checkPassword(req, admin, pw) {
  if (hit(`pw|${admin.id}`) > LIMITS.ip) {
    throw Object.assign(new Error('Too many attempts. Try again in 15 minutes.'), { status: 429 });
  }
  return bcrypt.compare(pw, admin.passwordHash);
}
