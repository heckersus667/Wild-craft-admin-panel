import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, Loading, PageHeader, Pagination, useAction, useApi } from '../components/ui.jsx';
import { fmtDate } from '../util.js';

function FilterWords() {
  const { can } = useAuth();
  const { data, error, reload } = useApi('/filter');
  const [word, setWord] = useState('');
  const [run, busy] = useAction();
  if (!data) return <Loading error={error} />;
  return (
    <div className="card">
      <h2>Chat filter</h2>
      <p className="muted small">Messages containing these words or links are blocked in game.</p>
      <div className="chips">
        {data.map((w) => (
          <span key={w} className="chip">
            {w}
            {can('filter.manage') && (
              <button className="chip-x" aria-label={`Remove ${w}`} onClick={() => run(() => api(`/filter/${encodeURIComponent(w)}`, { method: 'DELETE' }), 'Removed').then(reload)}>✕</button>
            )}
          </span>
        ))}
      </div>
      {can('filter.manage') && (
        <form className="row mt" onSubmit={(e) => { e.preventDefault(); run(() => api('/filter', { method: 'POST', body: { word } }), 'Added').then((ok) => ok && (setWord(''), reload())); }}>
          <input placeholder="Add word or domain…" value={word} onChange={(e) => setWord(e.target.value)} required />
          <button className="btn btn-primary" disabled={busy}>Add</button>
        </form>
      )}
    </div>
  );
}

export default function Chat() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState({ q: '', channel: '', page: 1 });
  const { data, error } = useApi('/chat' + qs(query));
  return (
    <>
      <PageHeader title="Chat & Filter" />
      <FilterWords />
      <div className="card">
        <h2>Chat logs</h2>
        <div className="row">
          <form className="row grow" onSubmit={(e) => { e.preventDefault(); setQuery({ ...query, q, page: 1 }); }}>
            <input placeholder="Search message or username…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn btn-primary">Search</button>
          </form>
          <select value={query.channel} onChange={(e) => setQuery({ ...query, channel: e.target.value, page: 1 })}>
            <option value="">All channels</option>
            <option value="global">Global</option>
            <option value="pack">Pack</option>
            <option value="private">Private</option>
          </select>
        </div>
        {!data ? <Loading error={error} /> : (
          <>
            <div className="chat-log tall mt">
              {data.items.map((c) => (
                <div key={c.id} className="chat-line">
                  <span className="muted small nowrap">{fmtDate(c.at)}</span>
                  <Badge>{c.channel}</Badge>
                  <span className="muted small">{c.serverId}</span>
                  <Link to={`/players/${c.playerId}`}><b>{c.username}</b></Link>
                  <span>{c.message}</span>
                </div>
              ))}
              {data.items.length === 0 && <p className="muted center">No messages.</p>}
            </div>
            <Pagination {...data} onPage={(page) => setQuery({ ...query, page })} />
          </>
        )}
      </div>
    </>
  );
}
