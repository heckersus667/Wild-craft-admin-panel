import { useState } from 'react';
import { api } from '../api.js';
import FormModal from '../components/FormModal.jsx';
import { Badge, Loading, PageHeader, useAction, useApi } from '../components/ui.jsx';
import { fmtDate, fmtNum } from '../util.js';

export default function Promos() {
  const { data, error, reload } = useApi('/promos');
  const skins = useApi('/economy/skins');
  const [creating, setCreating] = useState(false);
  const [run] = useAction();

  const skinName = (id) => skins.data?.find((s) => s.id === id)?.name || id;

  return (
    <>
      <PageHeader title="Promo codes">
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New code</button>
      </PageHeader>
      {!data ? <Loading error={error} /> : (
        <div className="card">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Code</th><th>Rewards</th><th>Uses</th><th>Expires</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {data.map((p) => {
                  const expired = p.expiresAt && new Date(p.expiresAt) < new Date();
                  const used = p.uses >= p.maxUses;
                  return (
                    <tr key={p.id}>
                      <td><code className="code">{p.code}</code></td>
                      <td>
                        {[p.rewards.gems && `💎 ${fmtNum(p.rewards.gems)}`, p.rewards.coins && `🪙 ${fmtNum(p.rewards.coins)}`, p.rewards.skinId && `🎨 ${skinName(p.rewards.skinId)}`].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td>{fmtNum(p.uses)} / {fmtNum(p.maxUses)}</td>
                      <td className="nowrap">{p.expiresAt ? fmtDate(p.expiresAt) : 'Never'}</td>
                      <td>
                        {expired ? <Badge kind="red">expired</Badge> : used ? <Badge kind="red">used up</Badge> : p.enabled ? <Badge kind="green">active</Badge> : <Badge>disabled</Badge>}
                      </td>
                      <td className="nowrap">
                        <button className="btn btn-sm" onClick={() => run(() => api(`/promos/${p.id}/enabled`, { method: 'POST', body: { enabled: !p.enabled } }), p.enabled ? 'Disabled' : 'Enabled').then(reload)}>
                          {p.enabled ? 'Disable' : 'Enable'}
                        </button>{' '}
                        <button className="btn btn-sm btn-ghost" onClick={() => confirm(`Delete ${p.code}?`) && run(() => api(`/promos/${p.id}`, { method: 'DELETE' }), 'Deleted').then(reload)}>Delete</button>
                      </td>
                    </tr>
                  );
                })}
                {data.length === 0 && <tr><td colSpan="6" className="muted center">No codes.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {creating && (
        <FormModal
          title="New promo code"
          submitLabel="Create"
          initial={{ code: Math.random().toString(36).slice(2, 10).toUpperCase(), maxUses: '1000', gems: '0', coins: '0' }}
          fields={[
            { name: 'code', label: 'Code', required: true, help: 'Letters and numbers, 4-24 characters' },
            { name: 'gems', label: 'Gems', type: 'number', min: 0 },
            { name: 'coins', label: 'Coins', type: 'number', min: 0 },
            { name: 'skinId', label: 'Skin (optional)', type: 'select', options: [{ value: '', label: 'None' }, ...(skins.data || []).map((s) => ({ value: s.id, label: s.name }))] },
            { name: 'maxUses', label: 'Max uses', type: 'number', min: 1, required: true },
            { name: 'expiresAt', label: 'Expires (optional)', type: 'datetime-local' },
          ]}
          onSubmit={(v) => run(() => api('/promos', { method: 'POST', body: { ...v, expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : null } }), 'Code created').then((ok) => (ok && reload(), ok))}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}
