import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { qs } from '../api.js';
import { Badge, Loading, PageHeader, Pagination, useApi, useClampPage } from '../components/ui.jsx';
import { fmtNum, timeAgo } from '../util.js';

const SPECIES = ['Wolf', 'Fox', 'Arctic Fox', 'Lynx', 'Tiger', 'Bear', 'Deer', 'Raccoon', 'Horse', 'Dragon'];

export function StatusBadges({ p }) {
  return (
    <>
      {p.online && <Badge kind="green">Online</Badge>}
      {p.banned && <Badge kind="red">Banned</Badge>}
      {p.muted && <Badge kind="amber">Muted</Badge>}
      {!p.online && !p.banned && !p.muted && <Badge>Offline</Badge>}
    </>
  );
}

export default function Players() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const status = params.get('status') || 'all';
  const species = params.get('species') || '';
  const page = Number(params.get('page')) || 1;
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]); // keep the box in sync with back/forward and nav clicks
  const set = useCallback((k, v) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      v ? next.set(k, v) : next.delete(k);
      if (k !== 'page') next.delete('page');
      return next;
    });
  }, [setParams]);
  const { data, error } = useApi('/players' + qs({ q, status, species, page }));
  useClampPage(data, useCallback((p) => set('page', String(p)), [set]));

  return (
    <>
      <PageHeader title="Players" />
      <div className="card filters">
        <form onSubmit={(e) => { e.preventDefault(); set('q', search); }} className="row">
          <input placeholder="Search username or player ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn-primary">Search</button>
        </form>
        <div className="row">
          <select value={status} onChange={(e) => set('status', e.target.value)}>
            <option value="all">All players</option>
            <option value="online">Online</option>
            <option value="banned">Banned</option>
            <option value="muted">Muted</option>
          </select>
          <select value={species} onChange={(e) => set('species', e.target.value)}>
            <option value="">Any animal</option>
            {SPECIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {!data ? <Loading error={error} /> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Player</th><th>Animal</th><th>Level</th><th>Region</th><th>Gems</th><th>Coins</th><th>Status</th><th>Last seen</th></tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/players/${p.id}`}><b>{p.username}</b></Link><div className="muted small">{p.id}</div></td>
                    <td>{p.species}</td>
                    <td>{p.level}</td>
                    <td>{p.region}</td>
                    <td>{fmtNum(p.gems)}</td>
                    <td>{fmtNum(p.coins)}</td>
                    <td><StatusBadges p={p} /></td>
                    <td className="nowrap">{p.online ? 'now' : timeAgo(p.lastSeenAt)}</td>
                  </tr>
                ))}
                {data.items.length === 0 && <tr><td colSpan="8" className="muted center">No players found.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination {...data} onPage={(p) => set('page', String(p))} />
        </div>
      )}
    </>
  );
}
