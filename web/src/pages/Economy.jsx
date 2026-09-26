import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, Loading, PageHeader, Pagination, useAction, useApi } from '../components/ui.jsx';
import { fmtDate, fmtNum } from '../util.js';

function GrantForm({ onDone }) {
  const skins = useApi('/economy/skins');
  const [run, busy] = useAction();
  const [f, setF] = useState({ playerId: '', kind: 'gems', amount: '', skinId: '', reason: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const isSkin = f.kind.startsWith('skin');
    const ok = await run(
      () =>
        isSkin
          ? api('/economy/skin', { method: 'POST', body: { playerId: f.playerId, skinId: f.skinId || skins.data[0].id, give: f.kind === 'skin_give', reason: f.reason } })
          : api('/economy/currency', { method: 'POST', body: { playerId: f.playerId, currency: f.kind, amount: Number(f.amount), reason: f.reason } }),
      'Done',
    );
    if (ok) {
      setF({ ...f, amount: '', reason: '' });
      onDone();
    }
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h2>Give or remove items</h2>
      <div className="grid three">
        <label>Player ID<input value={f.playerId} onChange={set('playerId')} placeholder="p100123" required /></label>
        <label>
          What
          <select value={f.kind} onChange={set('kind')}>
            <option value="gems">💎 Gems</option>
            <option value="coins">🪙 Coins</option>
            <option value="skin_give">🎨 Give skin</option>
            <option value="skin_remove">🎨 Remove skin</option>
          </select>
        </label>
        {f.kind.startsWith('skin') ? (
          <label>
            Skin
            <select value={f.skinId} onChange={set('skinId')}>
              {skins.data?.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.rarity})</option>)}
            </select>
          </label>
        ) : (
          <label>Amount<input type="number" value={f.amount} onChange={set('amount')} required placeholder="negative to remove" /></label>
        )}
      </div>
      <label>Reason<input value={f.reason} onChange={set('reason')} required placeholder="e.g. Event winner, bug compensation" /></label>
      <div><button className="btn btn-primary" disabled={busy}>Apply</button></div>
      <p className="help">Find player IDs on the <Link to="/players">Players</Link> page. Every change is recorded in the audit log.</p>
    </form>
  );
}

export default function Economy() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const { data, error, reload } = useApi('/economy/transactions' + qs({ page }));
  return (
    <>
      <PageHeader title="Economy" />
      {can('economy.grant') && <GrantForm onDone={reload} />}
      <div className="card">
        <h2>Staff economy history</h2>
        {!data ? <Loading error={error} /> : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>When</th><th>Player</th><th>Change</th><th>Reason</th><th>By</th></tr></thead>
                <tbody>
                  {data.items.map((t) => (
                    <tr key={t.id}>
                      <td className="nowrap muted">{fmtDate(t.at)}</td>
                      <td><Link to={`/players/${t.playerId}`}>{t.username}</Link></td>
                      <td>
                        <Badge kind={t.amount > 0 ? 'green' : 'red'}>
                          {t.type === 'skin' ? `${t.amount > 0 ? '+' : '−'} ${t.item}` : `${t.amount > 0 ? '+' : ''}${fmtNum(t.amount)} ${t.type}`}
                        </Badge>
                      </td>
                      <td>{t.reason}</td>
                      <td className="muted">{t.by}</td>
                    </tr>
                  ))}
                  {data.items.length === 0 && <tr><td colSpan="5" className="muted center">No changes yet.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination {...data} onPage={setPage} />
          </>
        )}
      </div>
    </>
  );
}
