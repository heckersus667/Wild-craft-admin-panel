import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, Loading, PageHeader, useAction, useApi } from '../components/ui.jsx';
import { timeAgo } from '../util.js';

export default function Servers() {
  const { can } = useAuth();
  const { data, error, reload } = useApi('/servers');
  const [run] = useAction();
  if (!data) return <Loading error={error} />;

  const maint = (s) => {
    const on = !s.maintenance;
    if (on && !confirm(`Put ${s.name} into maintenance? All ${s.online} players on it will be disconnected.`)) return;
    run(() => api(`/servers/${s.id}/maintenance`, { method: 'POST', body: { enabled: on } }), on ? 'Maintenance on' : 'Server back online').then(reload);
  };
  const restart = (s) => {
    if (!confirm(`Restart ${s.name}?`)) return;
    run(() => api(`/servers/${s.id}/restart`, { method: 'POST' }), 'Restart requested').then(reload);
  };

  return (
    <>
      <PageHeader title="Servers">
        <button className="btn" onClick={reload}>↻ Refresh</button>
      </PageHeader>
      <div className="grid servers">
        {data.map((s) => (
          <div key={s.id} className="card server">
            <div className="row between">
              <b>{s.name}</b>
              <Badge kind={s.status === 'online' ? 'green' : 'amber'}>{s.status}</Badge>
            </div>
            <div className="bar-track mt"><div className="bar-fill" style={{ width: `${Math.min(100, (s.online / s.capacity) * 100)}%` }} /></div>
            <div className="small muted">{s.online} / {s.capacity} players · v{s.version} · up since {timeAgo(s.startedAt)}</div>
            {can('servers.manage') && (
              <div className="row mt">
                <button className="btn btn-sm" onClick={() => maint(s)}>{s.maintenance ? 'End maintenance' : 'Maintenance'}</button>
                <button className="btn btn-sm" onClick={() => restart(s)}>Restart</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
