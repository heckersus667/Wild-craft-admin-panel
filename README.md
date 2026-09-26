# WildCraft Admin Panel

Staff web panel for WildCraft: moderate players, handle reports, read chat, manage the economy, servers, announcements, events and promo codes. It has real staff logins with roles and an audit log of every action.

**Right now it runs on mock game data.** Everything works, but actions change fake players, not the real game. To make it control the live game, the WildCraft dev fills in one file (see [Connecting the real game](#connecting-the-real-game)).

## Run it

Needs Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The first time the server starts it prints an **owner** username and password in the terminal. Log in with those, then change the password under your name (bottom left).

Production:

```bash
cp .env.example .env   # set JWT_SECRET and ADMIN_PASSWORD
npm run build
npm start              # serves panel + API on http://localhost:4000
```

Put it behind HTTPS (nginx, Caddy, Cloudflare, etc.). Login cookies are marked `Secure` in production, so plain HTTP will not work.

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
| Ban | up to 7 days | ✅ | ✅ |
| Rename players, permanent bans | | ✅ | ✅ |
| Economy, servers, announcements, events, promos, chat filter, audit log | | ✅ | ✅ |
| Manage staff accounts | | | ✅ |

Permissions are enforced by the server, not just hidden in the UI. Edit them in `server/src/permissions.js`.

## Connecting the real game

The panel never talks to the game directly. Every game action goes through a single adapter object:

- `server/src/game/mockAdapter.js`: fake data (used now)
- `server/src/game/liveAdapter.js`: **the dev implements this**

Steps for the dev:

1. Open `liveAdapter.js`. Each function has the same name, arguments and return shape as in `mockAdapter.js`. Use the mock as the spec.
2. Replace each `todo(...)` with a call to the real backend (internal HTTP API, database, RPC, whatever WildCraft uses). A few are already written as HTTP examples.
3. Set in `.env`:
   ```
   GAME_ADAPTER=live
   GAME_API_URL=https://internal-game-api.example
   GAME_API_KEY=...
   ```
4. Restart. The yellow "MOCK DATA" banner disappears when the live adapter is on.

Unfinished functions return a clear "not implemented yet" error, so it can be connected one feature at a time.

Throw an error with a `status` property (e.g. `404`, `409`) from an adapter function and the message is shown to staff.

## Security

- Passwords hashed with bcrypt; sessions are signed JWTs in `httpOnly`, `SameSite=Strict` cookies (12h).
- Changing a password, role or disabling an account logs that person out everywhere.
- Login lockout after 5 failed attempts per username+IP for 15 minutes.
- All write requests require a custom header, blocking cross-site form attacks.
- There must always be at least one active owner.
- Panel data (staff accounts, audit log) lives in `server/data/` as JSON. Back it up; keep it out of git (already ignored).

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
