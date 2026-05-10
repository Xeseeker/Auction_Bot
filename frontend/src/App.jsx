import { Suspense, lazy, startTransition, useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from './lib/api.js';
import { AppShell } from './components/AppShell.jsx';
import { useLocale } from './lib/i18n.jsx';
import { closeSocket, getSocket } from './lib/socket.js';

const DashboardPage = lazy(() =>
  import('./pages/DashboardPage.jsx').then((module) => ({ default: module.DashboardPage }))
);
const AuctionsPage = lazy(() =>
  import('./pages/AuctionsPage.jsx').then((module) => ({ default: module.AuctionsPage }))
);
const UsersPage = lazy(() => import('./pages/UsersPage.jsx').then((module) => ({ default: module.UsersPage })));
const StatsPage = lazy(() => import('./pages/StatsPage.jsx').then((module) => ({ default: module.StatsPage })));
const AuditLogsPage = lazy(() =>
  import('./pages/AuditLogsPage.jsx').then((module) => ({ default: module.AuditLogsPage }))
);
const LoginPage = lazy(() => import('./pages/LoginPage.jsx').then((module) => ({ default: module.LoginPage })));

function ProtectedLayout({ adminUser, onLogout, socketConnected }) {
  return (
    <AppShell adminUser={adminUser} onLogout={onLogout} socketConnected={socketConnected}>
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  const { t } = useLocale();
  const location = useLocation();
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [dashboard, setDashboard] = useState({ loading: true, error: '', data: null });
  const [auctions, setAuctions] = useState({
    loading: true,
    error: '',
    items: [],
    selected: null,
    detailLoading: false,
    query: '',
  });
  const [users, setUsers] = useState({ loading: true, error: '', items: [], query: '' });
  const [stats, setStats] = useState({ loading: true, error: '', data: null });
  const [auditLogs, setAuditLogs] = useState({ loading: true, error: '', items: [], query: '' });
  const [socketConnected, setSocketConnected] = useState(false);

  const handleUnauthorized = () => {
    setAdminUser(null);
    if (location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  };

  const loadSession = async () => {
    try {
      const session = await adminApi.session();
      setAdminUser(session.adminUser);
    } catch (error) {
      if (error.status === 401) {
        setAdminUser(null);
      }
    } finally {
      setAuthReady(true);
    }
  };

  const loadDashboard = async () => {
    setDashboard((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await adminApi.dashboard();
      setDashboard({ loading: false, error: '', data });
    } catch (error) {
      if (error.status === 401) {
        handleUnauthorized();
      }
      setDashboard({ loading: false, error: error.message, data: null });
    }
  };

  const loadAuctions = async (filters = null) => {
    const query = filters
      ? new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()
      : auctions.query;
    setAuctions((current) => ({ ...current, loading: true, error: '', query }));
    try {
      const data = await adminApi.auctions(query);
      setAuctions((current) => ({
        ...current,
        loading: false,
        error: '',
        items: data.items,
        query,
      }));
    } catch (error) {
      if (error.status === 401) {
        handleUnauthorized();
      }
      setAuctions((current) => ({ ...current, loading: false, error: error.message }));
    }
  };

  const loadAuctionDetail = async (auctionId) => {
    setAuctions((current) => ({ ...current, detailLoading: true, error: '' }));
    try {
      const data = await adminApi.auction(auctionId);
      setAuctions((current) => ({ ...current, selected: data, detailLoading: false }));
    } catch (error) {
      if (error.status === 401) {
        handleUnauthorized();
      }
      setAuctions((current) => ({ ...current, error: error.message, detailLoading: false }));
    }
  };

  const loadUsers = async (filters = null) => {
    const query = filters
      ? new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()
      : users.query;
    setUsers((current) => ({ ...current, loading: true, error: '', query }));
    try {
      const data = await adminApi.users(query);
      setUsers((current) => ({ ...current, loading: false, error: '', items: data.items, query }));
    } catch (error) {
      if (error.status === 401) {
        handleUnauthorized();
      }
      setUsers((current) => ({ ...current, loading: false, error: error.message }));
    }
  };

  const loadStats = async () => {
    setStats((current) => ({ ...current, loading: true, error: '' }));
    try {
      const data = await adminApi.stats();
      setStats({ loading: false, error: '', data });
    } catch (error) {
      if (error.status === 401) {
        handleUnauthorized();
      }
      setStats({ loading: false, error: error.message, data: null });
    }
  };

  const loadAuditLogs = async (filters = null) => {
    const query = filters
      ? new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString()
      : auditLogs.query;
    setAuditLogs((current) => ({ ...current, loading: true, error: '', query }));
    try {
      const data = await adminApi.auditLogs(query);
      setAuditLogs((current) => ({ ...current, loading: false, error: '', items: data.items, query }));
    } catch (error) {
      if (error.status === 401) {
        handleUnauthorized();
      }
      setAuditLogs((current) => ({ ...current, loading: false, error: error.message }));
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (!adminUser) {
      return;
    }

    startTransition(() => {
      loadDashboard();
      loadAuctions();
      loadUsers();
      loadStats();
      loadAuditLogs();
    });
  }, [adminUser]);

  useEffect(() => {
    if (!adminUser) {
      closeSocket();
      setSocketConnected(false);
      return undefined;
    }

    const socket = getSocket();
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);
    const handleUpdate = () => {
      startTransition(() => {
        loadDashboard();
        loadAuctions();
        loadUsers();
        loadStats();
        if (auctions.selected?.auction?._id) {
          loadAuctionDetail(auctions.selected.auction._id);
        }
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('platform:update', handleUpdate);
    socket.on('dashboard:update', handleUpdate);
    socket.on('auctions:update', handleUpdate);
    socket.on('users:update', handleUpdate);

    if (auctions.selected?.auction?._id) {
      socket.emit('platform:subscribe', { auctionId: auctions.selected.auction._id });
    }

    return () => {
      if (auctions.selected?.auction?._id) {
        socket.emit('platform:unsubscribe', { auctionId: auctions.selected.auction._id });
      }
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('platform:update', handleUpdate);
      socket.off('dashboard:update', handleUpdate);
      socket.off('auctions:update', handleUpdate);
      socket.off('users:update', handleUpdate);
    };
  }, [adminUser, auctions.query, auctions.selected?.auction?._id, users.query]);

  const login = async (credentials) => {
    setAuthLoading(true);
    try {
      const session = await adminApi.login(credentials);
      setAdminUser(session.adminUser);
      navigate('/', { replace: true });
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      await adminApi.logout();
    } catch {
      // Ignore logout API errors and clear local auth state regardless.
    } finally {
      setAdminUser(null);
      navigate('/login', { replace: true });
    }
  };

  const cancelAuction = async (auctionId, reason) => {
    await adminApi.cancelAuction(auctionId, { reason });
    await Promise.all([loadAuctions(), loadAuctionDetail(auctionId), loadDashboard(), loadStats()]);
  };

  const reviewAuction = async (auctionId, approved, reason = '') => {
    if (approved) {
      await adminApi.approveAuction(auctionId);
    } else {
      await adminApi.rejectAuction(auctionId, { reason });
    }

    await Promise.all([loadAuctions(), loadAuctionDetail(auctionId), loadDashboard(), loadStats()]);
  };

  const toggleBan = async (userId, banned, reason) => {
    await adminApi.banUser(userId, { banned, reason });
    await Promise.all([loadUsers(), loadDashboard()]);
  };

  const reviewSeller = async (userId, approved, reason = '') => {
    await adminApi.reviewSeller(userId, { approved, reason });
    await Promise.all([loadUsers(), loadDashboard()]);
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="glass-panel px-6 py-4 text-sm text-sand-100/70">{t('loading_admin')}</div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="glass-panel px-6 py-4 text-sm text-sand-100/70">{t('loading_view')}</div>
        </div>
      }
    >
      <Routes>
        <Route
          path="/login"
          element={adminUser ? <Navigate replace to="/" /> : <LoginPage onLogin={login} loading={authLoading} />}
        />

        <Route
          element={
            adminUser ? (
              <ProtectedLayout adminUser={adminUser} onLogout={logout} socketConnected={socketConnected} />
            ) : (
              <Navigate replace to="/login" />
            )
          }
        >
          <Route
            index
            element={
              <DashboardPage
                data={dashboard.data}
                error={dashboard.error}
                loading={dashboard.loading}
                onRefresh={loadDashboard}
              />
            }
          />
          <Route
            path="/auctions"
            element={
              <AuctionsPage
                auctions={auctions.items}
                detailLoading={auctions.detailLoading}
                error={auctions.error}
                loading={auctions.loading}
                onApprove={(auctionId) => reviewAuction(auctionId, true)}
                onCancel={cancelAuction}
                onReject={(auctionId, reason) => reviewAuction(auctionId, false, reason)}
                onSearch={loadAuctions}
                onSelect={loadAuctionDetail}
                selectedAuction={auctions.selected}
              />
            }
          />
          <Route
            path="/users"
            element={
              <UsersPage
                error={users.error}
                loading={users.loading}
                onApprovalReview={reviewSeller}
                onBanToggle={toggleBan}
                onSearch={loadUsers}
                users={users.items}
              />
            }
          />
          <Route
            path="/stats"
            element={<StatsPage data={stats.data} error={stats.error} loading={stats.loading} onRefresh={loadStats} />}
          />
          <Route
            path="/audit-logs"
            element={
              <AuditLogsPage
                error={auditLogs.error}
                loading={auditLogs.loading}
                logs={auditLogs.items}
                onSearch={loadAuditLogs}
              />
            }
          />
        </Route>

        <Route path="*" element={<Navigate replace to={adminUser ? '/' : '/login'} />} />
      </Routes>
    </Suspense>
  );
}
