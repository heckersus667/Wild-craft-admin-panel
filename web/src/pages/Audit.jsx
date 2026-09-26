import { useState } from 'react';
import { qs } from '../api.js';
import { Loading, PageHeader, Pagination, useApi } from '../components/ui.jsx';
import { fmtDate } from '../util.js';

export default function Audit() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState({ q: '', page: 1 });
  const { data, error } = useApi('/audit' + qs(query));
  return (
    <>
      <PageHeader title="Audit log" />
      <div className="card">
        <form className="row" onSubmit={(e) => { e.preventDefault(); setQuery({ q, page: 1 }); }}>
          <input placeholder="Filter by staff, action (e.g. player.ban) or target…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-primary">Filter</button>
        </form>
        {!data ? <Loading error={error} /> : (
          <>
            <div className="table-wrap mt">
              <table className="table">
                <thead><tr><th>When</th><th>Staff</th><th>Action</th><th>Target</th><th>Details</th><th>IP</th></tr></thead>
                <tbody>
                  {data.items.map((e) => (
                    <tr key={e.id}>
                      <td className="nowrap muted">{fmtDate(e.at)}</td>
                      <td><b>{e.admin}</b></td>
                      <td><code>{e.action}</code></td>
                      <td>{e.target}</td>
                      <td className="small">{Object.entries(e.details || {}).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}: ${v}`).join(' · ')}</td>
                      <td className="muted small">{e.ip}</td>
                    </tr>
                  ))}
                  {data.items.length === 0 && <tr><td colSpan="6" className="muted center">Nothing logged.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination {...data} onPage={(page) => setQuery({ ...query, page })} />
          </>
        )}
      </div>
    </>
  );
}
