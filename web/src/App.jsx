import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth.jsx';
import { ToastProvider } from './components/ui.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Players from './pages/Players.jsx';
import PlayerDetail from './pages/PlayerDetail.jsx';
import Reports from './pages/Reports.jsx';
import Chat from './pages/Chat.jsx';
import Economy from './pages/Economy.jsx';
import Servers from './pages/Servers.jsx';
import Announcements from './pages/Announcements.jsx';
import Events from './pages/Events.jsx';
import Promos from './pages/Promos.jsx';
import Audit from './pages/Audit.jsx';
import Admins from './pages/Admins.jsx';
import Account from './pages/Account.jsx';

function Guard({ perm, children }) {
  const { can } = useAuth();
  if (perm && !can(perm)) return <div className="alert alert-error">You don't have access to this page.</div>;
  return children;
}

function Routed() {
  const { loading, admin } = useAuth();
  if (loading) return <div className="loading full">Loading…</div>;
  if (!admin) return <Login />;
  const g = (perm, el) => <Guard perm={perm}>{el}</Guard>;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={g('dashboard.view', <Dashboard />)} />
        <Route path="players" element={g('players.view', <Players />)} />
        <Route path="players/:id" element={g('players.view', <PlayerDetail />)} />
        <Route path="reports" element={g('reports.view', <Reports />)} />
        <Route path="chat" element={g('chat.view', <Chat />)} />
        <Route path="economy" element={g('economy.view', <Economy />)} />
        <Route path="servers" element={g('servers.view', <Servers />)} />
        <Route path="announcements" element={g('announcements.manage', <Announcements />)} />
        <Route path="events" element={g('events.manage', <Events />)} />
        <Route path="promos" element={g('promos.manage', <Promos />)} />
        <Route path="audit" element={g('audit.view', <Audit />)} />
        <Route path="admins" element={g('admins.manage', <Admins />)} />
        <Route path="account" element={<Account />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routed />
      </AuthProvider>
    </ToastProvider>
  );
}
