import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, qs } from '../api.js';
import { useAuth } from '../auth.jsx';
import FormModal from '../components/FormModal.jsx';
import { Badge, Loading, PageHeader, Pagination, useAction, useApi, useClampPage } from '../components/ui.jsx';
import { timeAgo } from '../util.js';

const STATUS_KIND = { open: 'amber', resolved: 'green', dismissed: 'neutral' };

export default function Reports() {
  const { can } = useAuth();
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const [handling, setHandling] = useState(null);
  const { data, error, reload } = useApi('/reports' + qs({ status, page }));
  useClampPage(data, setPage);
  const [run] = useAction();

  return (
    <>
      <PageHeader title="Player reports">
        <div className="tabs">
          {['open', 'resolved', 'dismissed', 'all'].map((s) => (
            <button key={s} className={`tab ${status === s ? 'active' : ''}`} onClick={() => { setStatus(s); setPage(1); }}>{s}</button>
          ))}
        </div>
      </PageHeader>
      {!data ? <Loading error={error} /> : (
        <>
          {data.items.length === 0 && <div className="card muted center">No reports here. 🎉</div>}
          {data.items.map((r) => (
            <div key={r.id} className="card report">
              <div className="report-head">
                <div>
                  <Badge kind={STATUS_KIND[r.status]}>{r.status}</Badge> <b>{r.reason}</b>
                  <div className="small muted">
                    <Link to={`/players/${r.reporterId}`}>{r.reporterName}</Link> reported{' '}
                    <Link to={`/players/${r.targetId}`}><b>{r.targetName}</b></Link> · {r.serverId} · {timeAgo(r.createdAt)} · {r.id}
                  </div>
                </div>
                <div className="row">
                  <Link className="btn" to={`/players/${r.targetId}`}>Open player</Link>
                  {can('reports.handle') && r.status === 'open' && (
                    <>
                      <button className="btn btn-primary" onClick={() => setHandling({ r, status: 'resolved' })}>Resolve</button>
                      <button className="btn" onClick={() => setHandling({ r, status: 'dismissed' })}>Dismiss</button>
                    </>
                  )}
                  {can('reports.handle') && r.status !== 'open' && (
                    <button className="btn btn-ghost" onClick={() => run(() => api(`/reports/${r.id}`, { method: 'POST', body: { status: 'open' } }), 'Reopened').then(reload)}>Reopen</button>
                  )}
                </div>
              </div>
              {r.comment && <p className="quote">“{r.comment}”</p>}
              {r.evidence.length > 0 && (
                <div className="chat-log small">
                  {r.evidence.map((c) => (
                    <div key={c.id} className="chat-line"><span className="muted nowrap">{new Date(c.at).toLocaleTimeString()}</span><b>{c.username}:</b><span>{c.message}</span></div>
                  ))}
                </div>
              )}
              {r.handledBy && <div className="small muted mt">Handled by {r.handledBy} {timeAgo(r.handledAt)}{r.note ? `: ${r.note}` : ''}</div>}
            </div>
          ))}
          <Pagination {...data} onPage={setPage} />
        </>
      )}
      {handling && (
        <FormModal
          title={`${handling.status === 'resolved' ? 'Resolve' : 'Dismiss'} report ${handling.r.id}`}
          submitLabel={handling.status === 'resolved' ? 'Resolve' : 'Dismiss'}
          fields={[{ name: 'note', label: 'Note (what did you do?)', type: 'textarea', placeholder: 'e.g. Banned 3 days for harassment' }]}
          onSubmit={(v) => run(() => api(`/reports/${handling.r.id}`, { method: 'POST', body: { status: handling.status, note: v.note } }), 'Report updated').then((ok) => (ok && reload(), ok))}
          onClose={() => setHandling(null)}
        />
      )}
    </>
  );
}
