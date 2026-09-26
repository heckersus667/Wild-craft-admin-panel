import { createStore, newId } from './store.js';

// Keeps the newest MAX_ENTRIES. Raise it, or move to a real database, if you
// need a longer history (see README "Production").
const MAX_ENTRIES = 50000;
export const auditStore = createStore('audit', () => ({ list: [] }));

export function audit(req, action, target, details = {}, admin = req.admin) {
  auditStore.data.list.unshift({
    id: newId('log'),
    at: new Date().toISOString(),
    adminId: admin?.id,
    admin: admin?.username,
    action,
    target,
    details,
    ip: req.ip,
  });
  if (auditStore.data.list.length > MAX_ENTRIES) auditStore.data.list.length = MAX_ENTRIES;
  auditStore.flush();
}
