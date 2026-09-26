# Game adapter contract

`liveAdapter.js` must export the same functions as `mockAdapter.js`. The mock is the reference implementation; this file spells out the rules.

## General rules

- Every function is `async`.
- **Dates** are ISO 8601 strings (`2026-09-26T17:00:00.000Z`). "No end" is `null`.
- **Bans and mutes**: `{ reason, by, at, until }`. `until: null` means **permanent**. A missing `until` is also treated as permanent, so be explicit.
- **`by`** is always the *panel* staff username, not a game account.
- **Errors**: throw an `Error` with a `status` property. The message is shown to staff.
  - `404` not found (player, report, event, promo, word)
  - `409` conflict (player not online for kick, name taken, already owns skin, code exists)
  - `400` invalid input
  - Anything else becomes a generic "Server error". The `call()` helper already turns upstream timeouts, 5xx, 401 and 403 into `502` with a readable message.
- **Lists** return `{ items, total, page, pageSize }`. `page` and `pageSize` arrive as integers (`pageSize` at most 100). `total` may be an estimate for huge tables.
- **Write functions return the created or updated object** where noted; routes read fields from it.

## Functions

| Function | Arguments | Returns |
|---|---|---|
| `getStats()` | | `{ onlineNow, totalPlayers, activeToday, banned, muted, openReports, serversOnline, serversTotal, onlineHistory: [{at, online}] (24 hourly points, oldest first), species: [{name, count}] }` |
| `listPlayers(o)` | `{ q, status: 'all'\|'online'\|'banned'\|'muted', species, page, pageSize }`; `q` matches username (contains, any case) or exact player ID | list of `{ id, username, level, species, region, online, banned, muted, gems, coins, lastSeenAt }` |
| `getPlayer(id)` | | `{ id, username, level, species, animals: string[], gems, coins, skins: [{id, name, species, rarity}], region, device, online, serverId, createdAt, lastSeenAt, playtimeHours, packName, ban, mute, warnings: [{message, by, at}], nameHistory: [{from, to, at}], reportsAgainst, transactions: [...] }`. Missing arrays and numbers get defaults; `banned`/`muted` are computed from `ban`/`mute` if absent. |
| `banPlayer(id, o)` | `{ reason, until, by }` | nothing |
| `unbanPlayer(id)` | | nothing |
| `mutePlayer(id, o)` | `{ reason, until, by }` | nothing |
| `unmutePlayer(id)` | | nothing |
| `kickPlayer(id, o)` | `{ reason, by }`; show `reason` to the player. Throw 409 if offline. | nothing |
| `warnPlayer(id, o)` | `{ message, by }`; show `message` in game | nothing |
| `renamePlayer(id, o)` | `{ username }`. Throw 409 if taken. | nothing |
| `getPlayerChat(id)` | | array (newest first, up to 100) of chat messages, see `searchChat` |
| `listReports(o)` | `{ status: 'open'\|'resolved'\|'dismissed'\|'all', page, pageSize }` | list of `{ id, reporterId, reporterName, targetId, targetName, reason, comment, serverId, evidence: [chat message], status, createdAt, handledBy, handledAt, note }` |
| `updateReport(id, o)` | `{ status, note, by }` | the updated report |
| `searchChat(o)` | `{ q, serverId, channel: ''\|'global'\|'pack'\|'private', page, pageSize }` | list of `{ id, playerId, username, serverId, channel, message, at }` |
| `listSkins()` | | `[{ id, name, species, rarity: 'common'\|'rare'\|'epic'\|'legendary' }]` |
| `adjustCurrency(id, o)` | `{ currency: 'gems'\|'coins', amount (negative removes), reason, by, requestId }` | `{ id, playerId, username, type, amount (actually applied), balance, reason, by, at }` |
| `setSkin(id, o)` | `{ skinId, give: boolean, reason, by, requestId }` | `{ id, playerId, username, type: 'skin', amount: 1\|-1, item (skin name), reason, by, at }` |
| `listTransactions(o)` | `{ page, pageSize }` | list of the transaction objects above, newest first |
| `listServers()` | | `[{ id, name, region, capacity, online, maintenance, status: 'online'\|'maintenance'\|'offline', version, startedAt }]` |
| `setMaintenance(id, enabled)` | boolean; turning it on should disconnect players | nothing |
| `restartServer(id)` | | nothing |
| `listAnnouncements()` | | array of announcements |
| `createAnnouncement(a)` | `{ title, message, target, style: 'info'\|'warning'\|'event', expiresAt, by }`. `target` is `'all'`, `'region:<EU\|NA\|SA\|ASIA\|OCE>'`, or a server ID. | the created announcement including `id`, `createdAt` |
| `deleteAnnouncement(id)` | | nothing |
| `listEvents()` | | array of events |
| `saveEvent(ev)` | `{ id?, name, type: 'xp_multiplier'\|'coin_multiplier'\|'gem_sale'\|'boss_spawn'\|'custom', multiplier (number or null), startsAt, endsAt, enabled, description }`. **Creates** when there is no `id`, **updates** when there is. | the saved event |
| `deleteEvent(id)` | | nothing |
| `listPromos()` | | array of `{ id, code, rewards: {gems, coins, skinId}, maxUses, uses, expiresAt, enabled, createdAt }` |
| `createPromo(p)` | `{ code, rewards, maxUses, expiresAt }`. Throw 409 if code exists. | the created promo |
| `setPromoEnabled(id, enabled)` | boolean | nothing |
| `deletePromo(id)` | | nothing |
| `listFilterWords()` | | `string[]` |
| `addFilterWord(word)` | lowercase string | nothing |
| `removeFilterWord(word)` | | nothing |

## Double-grant protection

`adjustCurrency` and `setSkin` receive a unique `requestId`. If the game backend sees the same `requestId` twice (a retried request), it must return the first result instead of applying the change again. The example in `liveAdapter.js` sends it as an `Idempotency-Key` header.

## Hardcoded lists in the UI

Regions (`EU, NA, SA, ASIA, OCE`) and animals are listed in `web/src/pages/Players.jsx` and `web/src/pages/Announcements.jsx`. Update them if the real game differs.
