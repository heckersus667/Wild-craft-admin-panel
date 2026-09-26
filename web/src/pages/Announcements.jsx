import { useState } from 'react';
import { api } from '../api.js';
import FormModal from '../components/FormModal.jsx';
import { Badge, Loading, PageHeader, useAction, useApi } from '../components/ui.jsx';
import { fmtDate, timeAgo } from '../util.js';

export default function Announcements() {
  const { data, error, reload } = useApi('/announcements');
  const servers = useApi('/servers');
  const [creating, setCreating] = useState(false);
  const [run] = useAction();

  const targets = [
    { value: 'all', label: 'All servers' },
    ...['EU', 'NA', 'SA', 'ASIA', 'OCE'].map((r) => ({ value: `region:${r}`, label: `Region: ${r}` })),
    ...(servers.data || []).map((s) => ({ value: s.id, label: `Server: ${s.name}` })),
  ];

  return (
    <>
      <PageHeader title="Announcements">
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New announcement</button>
      </PageHeader>
      {!data ? <Loading error={error} /> : data.length === 0 ? <div className="card muted center">No announcements yet.</div> : data.map((a) => {
        const expired = a.expiresAt && new Date(a.expiresAt) < new Date();
        return (
          <div key={a.id} className={`card announce announce-${a.style}`}>
            <div className="row between">
              <div>
                <b>{a.title}</b> <Badge>{a.target}</Badge> {expired && <Badge kind="red">expired</Badge>}
                <div className="small muted">by {a.by} · {timeAgo(a.createdAt)} · {a.expiresAt ? `until ${fmtDate(a.expiresAt)}` : 'no expiry'}</div>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => confirm('Delete this announcement?') && run(() => api(`/announcements/${a.id}`, { method: 'DELETE' }), 'Deleted').then(reload)}>Delete</button>
            </div>
            <p>{a.message}</p>
          </div>
        );
      })}
      {creating && (
        <FormModal
          title="New in-game announcement"
          submitLabel="Send"
          fields={[
            { name: 'title', label: 'Title', required: true },
            { name: 'message', label: 'Message', type: 'textarea', required: true },
            { name: 'style', label: 'Style', type: 'select', options: [{ value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }, { value: 'event', label: 'Event' }] },
            { name: 'target', label: 'Send to', type: 'select', options: targets },
            { name: 'expiresAt', label: 'Expires (optional)', type: 'datetime-local' },
          ]}
          onSubmit={(v) => run(() => api('/announcements', { method: 'POST', body: { ...v, expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : null } }), 'Announcement sent').then((ok) => (ok && reload(), ok))}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}
