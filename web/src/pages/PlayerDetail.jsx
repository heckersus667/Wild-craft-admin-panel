import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import FormModal from '../components/FormModal.jsx';
import { Badge, Loading, useAction, useApi } from '../components/ui.jsx';
import { fmtDate, fmtNum, timeAgo, timeLeft } from '../util.js';
import { StatusBadges } from './Players.jsx';

const BAN_DURATIONS = [
  { value: '1', label: '1 hour' },
  { value: '24', label: '1 day' },
  { value: '72', label: '3 days' },
  { value: '168', label: '7 days' },
  { value: '720', label: '30 days' },
  { value: '', label: 'Permanent' },
];
const MUTE_DURATIONS = [
  { value: '10', label: '10 minutes' },
  { value: '60', label: '1 hour' },
  { value: '360', label: '6 hours' },
  { value: '1440', label: '1 day' },
  { value: '10080', label: '7 days' },
];
const REASONS = ['Cheating / hacking', 'Harassment', 'Inappropriate name', 'Spam', 'Scam / fake links', 'Griefing', 'Other'];

export default function PlayerDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { data: p, error, reload } = useApi(`/players/${id}`);
  const chat = useApi(can('chat.view') ? `/players/${id}/chat` : null);
  const skins = useApi(can('economy.grant') ? '/economy/skins' : null);
  const [modal, setModal] = useState(null);
  const [run] = useAction();

  if (!p) return <Loading error={error} />;

  const act = (path, body, msg) => run(() => api(`/players/${id}/${path}`, { method: 'POST', body }), msg).then((ok) => (ok && reload(), ok));
  const reasonField = { name: 'reason', label: 'Reason', type: 'select', options: REASONS.map((r) => ({ value: r, label: r })) };

  const modals = {
    ban: (
      <FormModal
        title={`Ban ${p.username}`}
        danger
        submitLabel="Ban player"
        fields={[
          reasonField,
          { name: 'hours', label: 'Duration', type: 'select', options: can('players.ban') ? BAN_DURATIONS : BAN_DURATIONS.slice(0, 4), help: can('players.ban') ? null : 'Moderators can ban for up to 7 days.' },
          { name: 'note', label: 'Extra details (optional)', type: 'textarea' },
        ]}
        onSubmit={(v) => act('ban', { reason: v.note ? `${v.reason}: ${v.note}` : v.reason, hours: v.hours || null }, 'Player banned')}
        onClose={() => setModal(null)}
      />
    ),
    mute: (
      <FormModal
        title={`Mute ${p.username}`}
        submitLabel="Mute"
        fields={[reasonField, { name: 'minutes', label: 'Duration', type: 'select', options: MUTE_DURATIONS }]}
        onSubmit={(v) => act('mute', v, 'Player muted')}
        onClose={() => setModal(null)}
      />
    ),
    kick: (
      <FormModal
        title={`Kick ${p.username}`}
        submitLabel="Kick"
        danger
        fields={[{ name: 'reason', label: 'Reason (shown to player)', placeholder: 'Optional' }]}
        onSubmit={(v) => act('kick', v, 'Player kicked')}
        onClose={() => setModal(null)}
      />
    ),
    warn: (
      <FormModal
        title={`Warn ${p.username}`}
        submitLabel="Send warning"
        fields={[{ name: 'message', label: 'Warning message (shown in game)', type: 'textarea', required: true }]}
        onSubmit={(v) => act('warn', v, 'Warning sent')}
        onClose={() => setModal(null)}
      />
    ),
    rename: (
      <FormModal
        title={`Rename ${p.username}`}
        submitLabel="Rename"
        initial={{ username: p.username }}
        fields={[{ name: 'username', label: 'New username', required: true, help: '3-20 characters: letters, numbers, _' }]}
        onSubmit={(v) => act('rename', v, 'Player renamed')}
        onClose={() => setModal(null)}
      />
    ),
    currency: (
      <FormModal
        title={`Give / remove currency: ${p.username}`}
        submitLabel="Apply"
        fields={[
          { name: 'currency', label: 'Currency', type: 'select', options: [{ value: 'gems', label: '💎 Gems' }, { value: 'coins', label: '🪙 Coins' }] },
          { name: 'amount', label: 'Amount', type: 'number', required: true, help: 'Use a negative number to remove.' },
          { name: 'reason', label: 'Reason', required: true, placeholder: 'e.g. compensation for bug' },
        ]}
        onSubmit={(v) => run(() => api('/economy/currency', { method: 'POST', body: { ...v, playerId: id, amount: Number(v.amount) } }), 'Balance updated').then((ok) => (ok && reload(), ok))}
        onClose={() => setModal(null)}
      />
    ),
    skin: skins.data && (
      <FormModal
        title={`Give / remove skin: ${p.username}`}
        submitLabel="Apply"
        fields={[
          { name: 'give', label: 'Action', type: 'select', options: [{ value: 'give', label: 'Give skin' }, { value: 'remove', label: 'Remove skin' }] },
          { name: 'skinId', label: 'Skin', type: 'select', options: skins.data.map((s) => ({ value: s.id, label: `${s.name} (${s.rarity})` })) },
          { name: 'reason', label: 'Reason', required: true },
        ]}
        onSubmit={(v) => run(() => api('/economy/skin', { method: 'POST', body: { ...v, give: v.give === 'give', playerId: id } }), 'Skins updated').then((ok) => (ok && reload(), ok))}
        onClose={() => setModal(null)}
      />
    ),
  };

  return (
    <>
      <div className="page-head">
        <div>
          <Link to="/players" className="muted small">← Players</Link>
          <h1>{p.username} <StatusBadges p={p} /></h1>
          <div className="muted small">{p.id}</div>
        </div>
        {can('players.moderate') && (
          <div className="page-actions wrap">
            <button className="btn" onClick={() => setModal('warn')}>⚠️ Warn</button>
            {p.muted
              ? <button className="btn" onClick={() => act('unmute', {}, 'Unmuted')}>🔊 Unmute</button>
              : <button className="btn" onClick={() => setModal('mute')}>🔇 Mute</button>}
            {p.online && <button className="btn" onClick={() => setModal('kick')}>👢 Kick</button>}
            {p.banned
              ? <button className="btn" onClick={() => act('unban', {}, 'Unbanned')}>✅ Unban</button>
              : <button className="btn btn-danger" onClick={() => setModal('ban')}>⛔ Ban</button>}
            {can('players.ban') && <button className="btn" onClick={() => setModal('rename')}>✏️ Rename</button>}
            {can('economy.grant') && <button className="btn" onClick={() => setModal('currency')}>💎 Currency</button>}
            {can('economy.grant') && <button className="btn" onClick={() => setModal('skin')}>🎨 Skins</button>}
          </div>
        )}
      </div>

      {p.banned && (
        <div className="alert alert-error">
          <b>Banned</b> by {p.ban.by} {timeAgo(p.ban.at)}: {p.ban.reason}. {p.ban.until ? `Ends in ${timeLeft(p.ban.until)}.` : 'Permanent.'}
        </div>
      )}
      {p.muted && (
        <div className="alert alert-warn">
          <b>Muted</b> by {p.mute.by}: {p.mute.reason}. Ends in {timeLeft(p.mute.until)}.
        </div>
      )}

      <div className="grid two">
        <div className="card">
          <h2>Profile</h2>
          <dl className="dl">
            <dt>Main animal</dt><dd>{p.species}</dd>
            <dt>Level</dt><dd>{p.level}</dd>
            <dt>Animals owned</dt><dd>{p.animals.join(', ')}</dd>
            <dt>Pack</dt><dd>{p.packName || '—'}</dd>
            <dt>Gems</dt><dd>💎 {fmtNum(p.gems)}</dd>
            <dt>Coins</dt><dd>🪙 {fmtNum(p.coins)}</dd>
            <dt>Region</dt><dd>{p.region}{p.serverId ? ` · on ${p.serverId}` : ''}</dd>
            <dt>Device</dt><dd>{p.device}</dd>
            <dt>Playtime</dt><dd>{fmtNum(p.playtimeHours)} h</dd>
            <dt>Joined</dt><dd>{fmtDate(p.createdAt)}</dd>
            <dt>Last seen</dt><dd>{p.online ? 'Online now' : fmtDate(p.lastSeenAt)}</dd>
            <dt>Reports against</dt><dd>{p.reportsAgainst}</dd>
          </dl>
        </div>
        <div className="card">
          <h2>Skins ({p.skins.length})</h2>
          <div className="chips">
            {p.skins.length ? p.skins.map((s) => <Badge key={s.id} kind={s.rarity}>{s.name}</Badge>) : <span className="muted">None</span>}
          </div>
          <h2 className="mt">Warnings ({p.warnings.length})</h2>
          {p.warnings.length ? (
            <ul className="list">{p.warnings.map((w, i) => <li key={i}>{w.message} <span className="muted small">· {w.by}, {timeAgo(w.at)}</span></li>)}</ul>
          ) : <p className="muted">None</p>}
          {p.nameHistory.length > 0 && (
            <>
              <h2 className="mt">Name history</h2>
              <ul className="list">{p.nameHistory.map((n, i) => <li key={i}>{n.from} → {n.to} <span className="muted small">· {timeAgo(n.at)}</span></li>)}</ul>
            </>
          )}
        </div>
      </div>

      {can('chat.view') && (
        <div className="card">
          <h2>Recent chat</h2>
          {!chat.data ? <Loading error={chat.error} /> : chat.data.length === 0 ? <p className="muted">No messages.</p> : (
            <div className="chat-log">
              {chat.data.map((c) => (
                <div key={c.id} className="chat-line">
                  <span className="muted small nowrap">{fmtDate(c.at)}</span>
                  <Badge>{c.channel}</Badge>
                  <span className="muted small">{c.serverId}</span>
                  <span>{c.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {p.transactions.length > 0 && (
        <div className="card">
          <h2>Staff economy changes</h2>
          <table className="table">
            <tbody>
              {p.transactions.map((t) => (
                <tr key={t.id}>
                  <td className="nowrap muted">{fmtDate(t.at)}</td>
                  <td>{t.type === 'skin' ? `${t.amount > 0 ? '+' : '−'} ${t.item}` : `${t.amount > 0 ? '+' : ''}${fmtNum(t.amount)} ${t.type}`}</td>
                  <td>{t.reason}</td>
                  <td className="muted">{t.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && modals[modal]}
    </>
  );
}
