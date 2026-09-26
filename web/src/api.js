export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => (onUnauthorized = fn);

const DEMO = import.meta.env.VITE_DEMO === '1';

export async function api(path, opts = {}) {
  if (DEMO) {
    const { demoApi } = await import('virtual:demo-api');
    try {
      return await demoApi(path, opts);
    } catch (e) {
      if (e.status === 401 && path !== '/auth/login' && path !== '/auth/me') onUnauthorized();
      throw new ApiError(e.message, e.status);
    }
  }
  const { method = 'GET', body } = opts;
  const res = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'wildcraft-admin' },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login' && path !== '/auth/me') onUnauthorized();
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status);
  }
  return data;
}

export const qs = (o) =>
  '?' + new URLSearchParams(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '')).toString();
