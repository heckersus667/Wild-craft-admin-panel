# WildCraft Admin Panel

Staff web panel for WildCraft: moderate players, handle reports, read chat, manage the economy, servers, announcements, events and promo codes. It has real staff logins with roles and an audit log of every action.

**Right now it runs on mock game data.** Everything works, but actions change fake players, not the real game. To make it control the live game, the WildCraft dev fills in one file (see [Connecting the real game](#connecting-the-real-game)).

## Run it

Needs Node.js 20.12 or newer (22 recommended).

```bash
npm install
npm run dev
```

Open http://localhost:5173. The first time the server starts it prints an **owner** username and password in the terminal. Log in with those, then change the password under your name (bottom left).

Production:

```bash
cp .env.example .env   # set JWT_SECRET (required), ADMIN_PASSWORD, TRUST_PROXY
npm run build
npm start              # serves panel + API on http://localhost:4000
```

Or with Docker (data kept in a volume):

```bash
docker build -t wildcraft-admin .
docker run -d --restart unless-stopped -p 4000:4000 --env-file .env -v wildcraft-admin-data:/data wildcraft-admin
```

Checklist:

- **HTTPS is required.** Login cookies are `Secure` in production, so plain HTTP will not log in. Put it behind Caddy, nginx or Cloudflare, and set `TRUST_PROXY` to the number of proxies in front (e.g. `1`). Leave it `0` if there is no proxy.
- **The server will not start in production without `JWT_SECRET`** (32+ characters).
- **Remove `ADMIN_PASSWORD` from `.env`** after the first start.
- **Run exactly one instance.** Staff accounts and the audit log are JSON files in `DATA_DIR`; two instances would overwrite each other. For multiple instances, move them to a database first.
- **Back up `DATA_DIR`** (`admins.json`, `audit.json`) regularly, e.g. a nightly copy. The audit log keeps the newest 50,000 entries.
- Health check: `GET /api/health`.

## Features

| Page | What it does |
|---|---|
| Dashboard | Players online, 24h chart, open reports, bans/mutes, most played animals, recent staff actions |
| Players | Search/filter players. Per player: profile, skins, warnings, name history, chat, and actions: warn, mute, kick, ban/unban, rename, give/remove gems, coins, skins |
| Reports | Open / resolved / dismissed reports with chat evidence; resolve or dismiss with a note |
| Chat & Filter | Search all chat logs; manage the blocked-words list |
| Economy | Give or remove gems, coins, skins by player ID; full history |
| Servers | Load per server, maintenance mode, restart |
| Announcements | In-game messages to all servers, a region, or one server, with expiry |
| Events | Schedule double XP, coin boosts, sales, boss spawns |
| Promo codes | Create codes with gem/coin/skin rewards, use limits and expiry |
| Audit log | Every staff action: who, what, when, IP |
| Staff accounts | Add staff, set roles, reset passwords, disable/delete |

### Roles

| | Moderator | Admin | Owner |
|---|:-:|:-:|:-:|
| View players, chat, reports | ✅ | ✅ | ✅ |
| Warn, mute, kick | ✅ | ✅ | ✅ |
| Ban and unban (bans up to 7 days) | ✅ | ✅ | ✅ |
| Longer or permanent bans, rename players | | ✅ | ✅ |
| Economy, servers, announcements, events, promos, chat filter, audit log (incl. recent actions on the dashboard) | | ✅ | ✅ |
| Manage staff accounts | | | ✅ |

Permissions are enforced by the server, not just hidden in the UI. Edit them in `server/src/permissions.js`.

## Connecting the real game

The panel never talks to the game directly. Every game action goes through a single adapter object:

- `server/src/game/mockAdapter.js`: fake data (used now)
- `server/src/game/liveAdapter.js`: **the dev implements this**

Steps for the dev:

1. Read [`server/src/game/CONTRACT.md`](server/src/game/CONTRACT.md): every function, its arguments, what it must return, error codes, and date/ban rules. `mockAdapter.js` is the working reference.
2. Replace each `todo(...)` with a call to the real backend (internal HTTP API, database, RPC, whatever WildCraft uses). A few are already written as HTTP examples.
3. Set in `.env`:
   ```
   GAME_ADAPTER=live
   GAME_API_URL=https://internal-game-api.example
   GAME_API_KEY=...
   ```
4. Restart. The yellow "MOCK DATA" banner disappears when the live adapter is on.

Unfinished functions return a clear "not implemented yet" error, so it can be connected one feature at a time.

Throw an error with a `status` property (e.g. `404`, `409`) from an adapter function and the message is shown to staff. Gem, coin and skin grants carry a `requestId` so the game can ignore retried requests instead of granting twice.

## Security

- Passwords hashed with bcrypt; sessions are signed JWTs in `httpOnly`, `SameSite=Strict` cookies (12h).
- Logging out, changing a password or role, or disabling an account ends that person's sessions everywhere.
- Login lockout: 5 failed attempts per username+IP, or 20 per username from anywhere, in 15 minutes. Same limit on the current-password check when changing passwords.
- Logins and failed logins are recorded in the audit log.
- All write requests require a custom header, blocking cross-site form attacks.
- There must always be at least one active owner.
- Panel data (staff accounts, audit log) lives in `DATA_DIR` (default `server/data/`) as JSON. Back it up; keep it out of git (already ignored).

## Project layout

```
server/            Express API
  src/auth.js        login, sessions, first owner account
  src/permissions.js roles
  src/routes/api.js  all endpoints
  src/game/          mock + live game adapters
web/               React (Vite) frontend
  src/pages/         one file per page
```
