import { createStore, newId } from './store.js';

export const auditStore = createStore('audit', () => ({ list: [] }));

export function audit(req, action, target, details = {}) {
  auditStore.data.list.unshift({
    id: newId('log'),
    at: new Date().toISOString(),
    adminId: req.admin?.id,
    admin: req.admin?.username,
    action,
    target,
    details,
    ip: req.ip,
  });
  if (auditStore.data.list.length > 5000) auditStore.data.list.length = 5000;
  auditStore.save();
}
