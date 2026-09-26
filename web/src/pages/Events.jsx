import { useState } from 'react';
import { api } from '../api.js';
import FormModal from '../components/FormModal.jsx';
import { Badge, Loading, PageHeader, useAction, useApi } from '../components/ui.jsx';
import { fmtDate, toLocalInput } from '../util.js';

const TYPES = [
  { value: 'xp_multiplier', label: 'XP multiplier' },
  { value: 'coin_multiplier', label: 'Coin multiplier' },
  { value: 'gem_sale', label: 'Gem shop sale' },
  { value: 'boss_spawn', label: 'Boss spawn' },
  { value: 'custom', label: 'Custom' },
];
const typeLabel = (t) => TYPES.find((x) => x.value === t)?.label || t;

function eventState(e) {
  const now = new Date();
  if (!e.enabled) return ['disabled', 'neutral'];
  if (new Date(e.endsAt) < now) return ['ended', 'neutral'];
  if (new Date(e.startsAt) > now) return ['scheduled', 'amber'];
  return ['live', 'green'];
}

export default function Events() {
  const { data, error, reload } = useApi('/events');
  const [editing, setEditing] = useState(null);
  const [run] = useAction();

  const save = (v) => {
    const body = { ...v, enabled: v.enabled === 'yes', startsAt: new Date(v.startsAt).toISOString(), endsAt: new Date(v.endsAt).toISOString() };
    const req = editing.id ? api(`/events/${editing.id}`, { method: 'PUT', body }) : api('/events', { method: 'POST', body });
    return run(() => req, 'Event saved').then((ok) => (ok && reload(), ok));
  };

  return (
    <>
      <PageHeader title="Events">
        <button className="btn btn-primary" onClick={() => setEditing({})}>+ New event</button>
      </PageHeader>
      {!data ? <Loading error={error} /> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Name</th><th>Type</th><th>Multiplier</th><th>Starts</th><th>Ends</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {data.map((e) => {
                  const [label, kind] = eventState(e);
                  return (
                    <tr key={e.id}>
                      <td><b>{e.name}</b>{e.description && <div className="small muted">{e.description}</div>}</td>
                      <td>{typeLabel(e.type)}</td>
                      <td>{e.multiplier ? `×${e.multiplier}` : '—'}</td>
                      <td className="nowrap">{fmtDate(e.startsAt)}</td>
                      <td className="nowrap">{fmtDate(e.endsAt)}</td>
                      <td><Badge kind={kind}>{label}</Badge></td>
                      <td className="nowrap">
                        <button className="btn btn-sm" onClick={() => setEditing(e)}>Edit</button>{' '}
                        <button className="btn btn-sm btn-ghost" onClick={() => confirm(`Delete "${e.name}"?`) && run(() => api(`/events/${e.id}`, { method: 'DELETE' }), 'Deleted').then(reload)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
                {data.length === 0 && <tr><td colSpan="7" className="muted center">No events.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {editing && (
        <FormModal
          title={editing.id ? `Edit ${editing.name}` : 'New event'}
          initial={{
            ...editing,
            startsAt: toLocalInput(editing.startsAt || new Date()),
            endsAt: toLocalInput(editing.endsAt || Date.now() + 2 * 86400000),
            multiplier: editing.multiplier ?? '',
            enabled: editing.enabled === false ? 'no' : 'yes',
          }}
          fields={[
            { name: 'name', label: 'Name', required: true },
            { name: 'type', label: 'Type', type: 'select', options: TYPES },
            { name: 'multiplier', label: 'Multiplier (optional)', type: 'number', help: 'e.g. 2 for double XP, 0.5 for 50% off' },
            { name: 'startsAt', label: 'Starts', type: 'datetime-local', required: true },
            { name: 'endsAt', label: 'Ends', type: 'datetime-local', required: true },
            { name: 'description', label: 'Description (optional)', type: 'textarea' },
            { name: 'enabled', label: 'Enabled', type: 'select', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] },
          ]}
          onSubmit={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
