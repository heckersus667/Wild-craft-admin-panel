import { useState } from 'react';
import { Modal } from './ui.jsx';

// Small declarative form in a modal.
// fields: [{ name, label, type: 'text'|'textarea'|'number'|'select'|'datetime-local'|'password', options: [{value,label}], required, placeholder, help }]
export default function FormModal({ title, fields, initial = {}, submitLabel = 'Save', danger, onSubmit, onClose }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? (f.type === 'select' ? f.options[0]?.value : '')])),
  );
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit(values);
    setBusy(false);
    if (ok !== false) onClose();
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="form">
        {fields.map((f) => (
          <label key={f.name}>
            {f.label}
            {f.type === 'textarea' ? (
              <textarea value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} required={f.required} placeholder={f.placeholder} rows={3} />
            ) : f.type === 'select' ? (
              <select value={values[f.name]} onChange={(e) => set(f.name, e.target.value)}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type={f.type || 'text'} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} required={f.required} placeholder={f.placeholder} min={f.min} max={f.max} list={f.list} />
            )}
            {f.help && <span className="help">{f.help}</span>}
          </label>
        ))}
        <div className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy}>{busy ? 'Working…' : submitLabel}</button>
        </div>
      </form>
    </Modal>
  );
}
