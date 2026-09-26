import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

// ---- data loading ----
export function useApi(path, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(async () => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true }));
    try {
      setState({ data: await api(path), error: null, loading: false });
    } catch (e) {
      setState({ data: null, error: e.message, loading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}

// ---- toasts ----
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// Runs an API action with toast feedback. Returns true on success.
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn, success) => {
    setBusy(true);
    try {
      await fn();
      if (success) toast(success);
      return true;
    } catch (e) {
      toast(e.message, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };
  return [run, busy];
}

// ---- widgets ----
export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Prev</button>
      <span>Page {page} of {pages} · {total.toLocaleString()} total</span>
      <button className="btn" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next ›</button>
    </div>
  );
}

export const Badge = ({ kind = 'neutral', children }) => <span className={`badge badge-${kind}`}>{children}</span>;

export function Loading({ error }) {
  if (error) return <div className="alert alert-error">{error}</div>;
  return <div className="loading">Loading…</div>;
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className={`card stat ${tone ? 'stat-' + tone : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, children }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      <div className="page-actions">{children}</div>
    </div>
  );
}
