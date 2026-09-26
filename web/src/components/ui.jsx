import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

// ---- data loading ----
// Loads `path`; returns { data, error, loading, reload }. Responses for a path
// that is no longer current are ignored, and data is cleared when the path changes.
export function useApi(path) {
  const [state, setState] = useState({ path: null, data: null, error: null, loading: Boolean(path) });
  const latest = useRef(0);
  const load = useCallback(async () => {
    const req = ++latest.current;
    if (!path) {
      setState({ path, data: null, error: null, loading: false });
      return;
    }
    setState((s) => ({ path, data: s.path === path ? s.data : null, error: null, loading: true }));
    try {
      const data = await api(path);
      if (req === latest.current) setState({ path, data, error: null, loading: false });
    } catch (e) {
      if (req === latest.current) setState({ path, data: null, error: e.message, loading: false });
    }
  }, [path]);
  useEffect(() => {
    load();
  }, [load]);
  const current = state.path === path;
  return { data: current ? state.data : null, error: current ? state.error : null, loading: !current || state.loading, reload: load };
}

// When a list's current page is past the end (e.g. after resolving the last
// items on it), jump to the last page that has items.
export function useClampPage(data, setPage) {
  useEffect(() => {
    if (!data || data.total === 0) return;
    const last = Math.ceil(data.total / data.pageSize);
    if (data.page > last) setPage(last);
  }, [data, setPage]);
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
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role={t.type === 'error' ? 'alert' : undefined}>{t.message}</div>
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
const FOCUSABLE = 'input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])';
export function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const opener = document.activeElement;
    const el = ref.current;
    // Focus the first form field (or the first button).
    (el.querySelector('input, select, textarea') || el.querySelector(FOCUSABLE))?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') return closeRef.current();
      if (e.key !== 'Tab') return;
      const items = [...el.querySelectorAll(FOCUSABLE)].filter((x) => !x.disabled);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, []);
  const titleId = useRef('m' + Math.random().toString(36).slice(2)).current;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="modal-head">
          <h3 id={titleId}>{title}</h3>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1 && page <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn" disabled={page <= 1} onClick={() => onPage(Math.min(page - 1, pages))}>‹ Prev</button>
      <span>Page {page} of {pages} · {total.toLocaleString()} total</span>
      <button className="btn" disabled={page >= pages} onClick={() => onPage(Math.min(page + 1, pages))}>Next ›</button>
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
