import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../auth.jsx';

export const NAV = [
  { to: '/', label: 'Dashboard', icon: '📊', perm: 'dashboard.view', end: true },
  { to: '/players', label: 'Players', icon: '🐺', perm: 'players.view' },
  { to: '/reports', label: 'Reports', icon: '🚩', perm: 'reports.view' },
  { to: '/chat', label: 'Chat & Filter', icon: '💬', perm: 'chat.view' },
  { to: '/economy', label: 'Economy', icon: '💎', perm: 'economy.view' },
  { to: '/servers', label: 'Servers', icon: '🖥️', perm: 'servers.view' },
  { to: '/announcements', label: 'Announcements', icon: '📢', perm: 'announcements.manage' },
  { to: '/events', label: 'Events', icon: '🎉', perm: 'events.manage' },
  { to: '/promos', label: 'Promo Codes', icon: '🎁', perm: 'promos.manage' },
  { to: '/audit', label: 'Audit Log', icon: '📜', perm: 'audit.view' },
  { to: '/admins', label: 'Staff Accounts', icon: '🛡️', perm: 'admins.manage' },
];

export default function Layout() {
  const { admin, adapter, can, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const signOut = async () => {
    await logout();
    navigate('/', { replace: true });
  };
  return (
    <div className={`shell ${open ? 'nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">🐾</span>
          <div>
            <div className="brand-name">WildCraft</div>
            <div className="brand-sub">Admin Panel</div>
          </div>
        </div>
        <nav onClick={() => setOpen(false)}>
          {NAV.filter((n) => can(n.perm)).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <NavLink to="/account" className="nav-link" onClick={() => setOpen(false)}>
            <span className="nav-icon">👤</span>
            <span>
              {admin.username}
              <span className="role">{admin.role}</span>
            </span>
          </NavLink>
          <button className="btn btn-ghost w-full" onClick={signOut}>Log out</button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn-icon menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
          {adapter === 'mock' && (
            <div className="mock-banner">MOCK DATA: not connected to the live game. See README → "Connecting the real game".</div>
          )}
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      {open && <div className="nav-scrim" onClick={() => setOpen(false)} />}
    </div>
  );
}
