import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createStore, newId } from './store.js';
import { can, ROLES } from './permissions.js';

const COOKIE = 'wc_admin';
const SESSION_HOURS = 12;

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
  admins.save();
  console.log('\n==============================================');
  console.log(' First owner account created');
  console.log(`   username: ${username}`);
  if (!process.env.ADMIN_PASSWORD) console.log(`   password: ${password}`);
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

// Basic brute-force protection: 5 failures per username+IP per 15 minutes.
const failures = new Map();
const WINDOW = 15 * 60 * 1000;
function tooMany(key) {
  const f = failures.get(key);
  if (!f || Date.now() - f.first > WINDOW) return false;
  return f.count >= 5;
}
function recordFailure(key) {
  const f = failures.get(key);
  if (!f || Date.now() - f.first > WINDOW) failures.set(key, { first: Date.now(), count: 1 });
  else f.count++;
}

export async function login(req, res) {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const key = `${username.toLowerCase()}|${req.ip}`;
  if (tooMany(key)) return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });

  const admin = admins.data.list.find((a) => a.username.toLowerCase() === username.toLowerCase());
  const ok = admin && !admin.disabled && (await bcrypt.compare(password, admin.passwordHash));
  if (!ok) {
    recordFailure(key);
    return res.status(401).json({ error: 'Wrong username or password' });
  }
  failures.delete(key);
  admin.lastLoginAt = new Date().toISOString();
  admins.save();

  const token = jwt.sign({ sub: admin.id, v: admin.tokenVersion }, JWT_SECRET, {
    expiresIn: `${SESSION_HOURS}h`,
  });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_HOURS * 3600 * 1000,
  });
  res.json({ admin: publicAdmin(admin) });
}

export function logout(_req, res) {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const admin = admins.data.list.find((a) => a.id === payload.sub);
    if (!admin || admin.disabled || admin.tokenVersion !== payload.v) {
      return res.status(401).json({ error: 'Session expired' });
    }
    req.admin = admin;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired' });
  }
}

export const requirePerm = (perm) => (req, res, next) =>
  can(req.admin.role, perm) ? next() : res.status(403).json({ error: `Missing permission: ${perm}` });

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
export async function checkPassword(admin, pw) {
  return bcrypt.compare(pw, admin.passwordHash);
}
