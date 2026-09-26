import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import FormModal from '../components/FormModal.jsx';
import { Badge, Loading, PageHeader, useAction, useApi } from '../components/ui.jsx';
import { fmtDate } from '../util.js';

const ROLES = [
  { value: 'moderator', label: 'Moderator: players, reports, chat' },
  { value: 'admin', label: 'Admin: + economy, servers, events, bans' },
  { value: 'owner', label: 'Owner: + manage staff accounts' },
];

export default function Admins() {
  const { admin: me } = useAuth();
  const { data, error, reload } = useApi('/admins');
  const [modal, setModal] = useState(null);
  const [run] = useAction();
  const patch = (a, body, msg) => run(() => api(`/admins/${a.id}`, { method: 'PATCH', body }), msg).then((ok) => (ok && reload(), ok));

  return (
    <>
      <PageHeader title="Staff accounts">
        <button className="btn btn-primary" onClick={() => setModal({ type: 'create' })}>+ Add staff</button>
      </PageHeader>
      {!data ? <Loading error={error} /> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Username</th><th>Role</th><th>Status</th><th>Last login</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {data.map((a) => (
                  <tr key={a.id}>
                    <td><b>{a.username}</b>{a.id === me.id && <span className="muted small"> (you)</span>}</td>
                    <td><Badge kind={a.role === 'owner' ? 'legendary' : a.role === 'admin' ? 'epic' : 'rare'}>{a.role}</Badge></td>
                    <td>{a.disabled ? <Badge kind="red">disabled</Badge> : <Badge kind="green">active</Badge>}</td>
                    <td className="nowrap">{fmtDate(a.lastLoginAt)}</td>
                    <td className="nowrap muted">{fmtDate(a.createdAt)}</td>
                    <td className="nowrap">
                      <button className="btn btn-sm" onClick={() => setModal({ type: 'role', a })}>Role</button>{' '}
                      <button className="btn btn-sm" onClick={() => setModal({ type: 'password', a })}>Reset password</button>{' '}
                      {a.id !== me.id && (
                        <>
                          <button className="btn btn-sm" onClick={() => patch(a, { disabled: !a.disabled }, a.disabled ? 'Enabled' : 'Disabled')}>{a.disabled ? 'Enable' : 'Disable'}</button>{' '}
                          <button className="btn btn-sm btn-ghost" onClick={() => confirm(`Delete ${a.username}?`) && run(() => api(`/admins/${a.id}`, { method: 'DELETE' }), 'Deleted').then(reload)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {modal?.type === 'create' && (
        <FormModal
          title="Add staff account"
          submitLabel="Create"
          fields={[
            { name: 'username', label: 'Username', required: true },
            { name: 'password', label: 'Temporary password', type: 'password', required: true, help: 'At least 10 characters. Ask them to change it after first login.' },
            { name: 'role', label: 'Role', type: 'select', options: ROLES },
          ]}
          onSubmit={(v) => run(() => api('/admins', { method: 'POST', body: v }), 'Staff account created').then((ok) => (ok && reload(), ok))}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'role' && (
        <FormModal
          title={`Change role: ${modal.a.username}`}
          initial={{ role: modal.a.role }}
          fields={[{ name: 'role', label: 'Role', type: 'select', options: ROLES }]}
          onSubmit={(v) => patch(modal.a, v, 'Role updated')}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'password' && (
        <FormModal
          title={`Reset password: ${modal.a.username}`}
          fields={[{ name: 'password', label: 'New password', type: 'password', required: true, help: 'At least 10 characters. They will be logged out.' }]}
          onSubmit={(v) => patch(modal.a, v, 'Password reset')}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
