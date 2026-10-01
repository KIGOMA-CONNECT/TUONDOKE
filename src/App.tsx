import React, { Suspense, lazy, useEffect, useRef, useState, Component, ReactNode, ErrorInfo } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context';
import { api } from './api';
import Onboarding, { hasSeenOnboarding } from './components/Onboarding';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Book = lazy(() => import('./pages/Book'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Driver = lazy(() => import('./pages/Driver'));
const Admin = lazy(() => import('./pages/Admin'));
const Profile = lazy(() => import('./pages/Profile'));
const Cargo = lazy(() => import('./pages/Cargo'));
const Finance = lazy(() => import('./pages/Finance'));
const Support = lazy(() => import('./pages/Support'));
const Safety = lazy(() => import('./pages/Safety'));
const Loyalty = lazy(() => import('./pages/Loyalty'));
const Referrals = lazy(() => import('./pages/Referrals'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Chat = lazy(() => import('./pages/Chat'));
const Insurance = lazy(() => import('./pages/Insurance'));
const Membership = lazy(() => import('./pages/Membership'));
const Fleet = lazy(() => import('./pages/Fleet'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Changelog = lazy(() => import('./pages/Changelog'));
const Legal = lazy(() => import('./pages/Legal'));
const OfflinePage = lazy(() => import('./pages/Offline'));

const Loading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
    <div style={{ width: 32, height: 32, border: '3px solid #eee', borderTopColor: '#00E676', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
  </div>
);

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('ErrorBoundary:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ textAlign: 'center', padding: 60, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💥</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Kuna hitilafu</div>
          <div style={{ fontSize: 14, color: '#888', marginBottom: 24, maxWidth: 320 }}>{this.state.error?.message || 'Hitilafu haijulikani imetokea.'}</div>
          <button onClick={() => { this.setState({ hasError: false, error: null }); location.reload(); }} style={{ background: '#00E676', color: '#000', padding: '12px 24px', borderRadius: 8, fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            Packia Tena
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Guard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function TopNav() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const poll = async () => {
      try {
        const r = await api('GET', '/notifications/unread-count');
        if (active && r.status === 200) setUnread(r.json.count || 0);
      } catch { /* ignore */ }
    };
    poll();
    const id = setInterval(poll, 30000);
    return () => { active = false; clearInterval(id); };
  }, [user]);

  if (!user) return null;
  return (
    <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#fff', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', zIndex: 100 }}>
      <Link to="/" style={{ fontSize: 18, fontWeight: 800, color: '#00E676' }}>TUONDOKE</Link>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link to="/book" style={{ fontSize: 14, fontWeight: loc.pathname === '/book' ? 700 : 400, color: loc.pathname === '/book' ? '#00E676' : '#666' }}>Safari</Link>
        <Link to="/wallet" style={{ fontSize: 14, fontWeight: loc.pathname === '/wallet' ? 700 : 400, color: loc.pathname === '/wallet' ? '#00E676' : '#666' }}>Pochi</Link>
        <div style={{ position: 'relative' }}>
          <Link to="/profile" style={{ fontSize: 14, fontWeight: loc.pathname === '/profile' ? 700 : 400, color: loc.pathname === '/profile' ? '#00E676' : '#666' }}>👤</Link>
          {unread > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -8, background: '#f44336', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer style={{ background: '#1a1a1a', color: '#aaa', padding: '32px 20px 100px', fontSize: 13, lineHeight: 1.8 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#00E676', marginBottom: 8 }}>TUONDOKE</div>
        <div style={{ marginBottom: 16 }}>Healing & Logistics Platform</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
          <Link to="/legal" style={{ color: '#aaa' }}>Masharti ya Kutumia</Link>
          <Link to="/legal" style={{ color: '#aaa' }}>Sera ya Faragha</Link>
          <Link to="/changelog" style={{ color: '#aaa' }}>Mabadiliko</Link>
          <Link to="/support" style={{ color: '#aaa' }}>Msaada</Link>
        </div>
        <div style={{ color: '#666', fontSize: 12 }}>
          &copy; {new Date().getFullYear()} TUONDOKE. Haki zote zimehifadhiwa. Toleo 1.1.0
        </div>
      </div>
    </footer>
  );
}

function SkipLink() {
  return (
    <a href="#main-content" style={{ position: 'absolute', top: -40, left: 0, background: '#00E676', color: '#000', padding: '8px 16px', zIndex: 9999, fontWeight: 600, transition: 'top 0.2s' }}
      onFocus={(e) => { (e.target as HTMLElement).style.top = '0'; }}
      onBlur={(e) => { (e.target as HTMLElement).style.top = '-40px'; }}
    >
      Ruka hadi maudhui
    </a>
  );
}

function FocusOnRoute() {
  const loc = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => { mainRef.current?.focus(); }, [loc.pathname]);
  return <div ref={mainRef} id="main-content" tabIndex={-1} style={{ outline: 'none' }} />;
}

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return (
    <div style={{ background: '#ff9800', color: '#000', textAlign: 'center', padding: '8px 16px', fontSize: 13, fontWeight: 600, position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200 }}>
      ⚡ Huna mtandao — baadhi ya huduma hazipatikani
    </div>
  );
}

function BottomNav() {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return null;
  const items = [
    { path: '/book', icon: '🚖', label: 'Safari' },
    { path: '/wallet', icon: '💰', label: 'Pochi' },
    ...(user.role === 'driver' ? [{ path: '/driver', icon: '🚗', label: 'Dereva' }] : []),
    ...(user.role === 'admin' ? [{ path: '/admin', icon: '⚙️', label: 'Admin' }] : []),
    { path: '/profile', icon: '👤', label: 'Akaunti' },
  ];
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-around', padding: '8px 0', zIndex: 100 }}>
      {items.map(i => (
        <Link key={i.path} to={i.path} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 11, color: loc.pathname.startsWith(i.path) ? '#00E676' : '#666', fontWeight: loc.pathname.startsWith(i.path) ? 700 : 400 }}>
          <span style={{ fontSize: 20 }}>{i.icon}</span>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}

function AppInner() {
  const { user, loading } = useAuth();
  const [showOnboard, setShowOnboard] = useState(false);

  useEffect(() => {
    if (!loading && user && !hasSeenOnboarding()) setShowOnboard(true);
  }, [user, loading]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  if (loading) return <Loading />;

  return (
    <div style={{ minHeight: '100vh', paddingBottom: user ? 80 : 0 }}>
      <SkipLink />
      <TopNav />
      <OfflineBanner />
      <FocusOnRoute />
      {showOnboard && <Onboarding onDone={() => setShowOnboard(false)} />}
      <div style={{ paddingTop: user ? 50 : 0 }}>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/offline" element={<OfflinePage />} />
            <Route path="/legal" element={<Legal />} />
            <Route path="/changelog" element={<Changelog />} />
            <Route path="/book" element={<Guard><Book /></Guard>} />
            <Route path="/wallet" element={<Guard><Wallet /></Guard>} />
            <Route path="/driver" element={<Guard><Driver /></Guard>} />
            <Route path="/admin" element={<Guard><Admin /></Guard>} />
            <Route path="/profile" element={<Guard><Profile /></Guard>} />
            <Route path="/cargo" element={<Guard><Cargo /></Guard>} />
            <Route path="/finance" element={<Guard><Finance /></Guard>} />
            <Route path="/support" element={<Guard><Support /></Guard>} />
            <Route path="/safety" element={<Guard><Safety /></Guard>} />
            <Route path="/loyalty" element={<Guard><Loyalty /></Guard>} />
            <Route path="/referrals" element={<Guard><Referrals /></Guard>} />
            <Route path="/reviews" element={<Guard><Reviews /></Guard>} />
            <Route path="/chat/:tripId" element={<Guard><Chat /></Guard>} />
            <Route path="/insurance" element={<Guard><Insurance /></Guard>} />
            <Route path="/membership" element={<Guard><Membership /></Guard>} />
            <Route path="/fleet" element={<Guard><Fleet /></Guard>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ErrorBoundary>
  );
}
