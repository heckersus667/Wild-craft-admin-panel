import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Badge, PageHeader, useAction } from '../components/ui.jsx';

export default function Account() {
  const { admin, logout } = useAuth();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [run, busy] = useAction();
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (f.next !== f.confirm) return setErr("New passwords don't match");
    setErr('');
    const ok = await run(() => api('/auth/password', { method: 'POST', body: { current: f.current, next: f.next } }), 'Password changed. Please log in again.');
    if (ok) logout();
  };

  return (
    <>
      <PageHeader title="My account" />
      <div className="grid two">
        <div className="card">
          <h2>{admin.username} <Badge>{admin.role}</Badge></h2>
          <p className="muted small">Your permissions:</p>
          <div className="chips">{admin.permissions.map((p) => <span key={p} className="chip">{p}</span>)}</div>
        </div>
        <form className="card form" onSubmit={submit}>
          <h2>Change password</h2>
          {err && <div className="alert alert-error">{err}</div>}
          <label>Current password<input type="password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required autoComplete="current-password" /></label>
          <label>New password<input type="password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} required minLength={10} autoComplete="new-password" /></label>
          <label>Confirm new password<input type="password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required autoComplete="new-password" /></label>
          <div><button className="btn btn-primary" disabled={busy}>Change password</button></div>
        </form>
      </div>
    </>
  );
}
