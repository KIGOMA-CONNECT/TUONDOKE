import React from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context';

import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Book from './pages/Book';
import Wallet from './pages/Wallet';
import Driver from './pages/Driver';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import Cargo from './pages/Cargo';
import Finance from './pages/Finance';
import Support from './pages/Support';
import Safety from './pages/Safety';
import Loyalty from './pages/Loyalty';
import Referrals from './pages/Referrals';
import Reviews from './pages/Reviews';
import Chat from './pages/Chat';
import Insurance from './pages/Insurance';
import Membership from './pages/Membership';
import Fleet from './pages/Fleet';
import NotFound from './pages/NotFound';

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
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  return (
    <div style={{ minHeight: '100vh', paddingBottom: user ? 80 : 0 }}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/book" element={<Book />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/driver" element={<Driver />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/cargo" element={<Cargo />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/support" element={<Support />} />
        <Route path="/safety" element={<Safety />} />
        <Route path="/loyalty" element={<Loyalty />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/reviews" element={<Reviews />} />
        <Route path="/chat/:tripId" element={<Chat />} />
        <Route path="/insurance" element={<Insurance />} />
        <Route path="/membership" element={<Membership />} />
        <Route path="/fleet" element={<Fleet />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return <AuthProvider><AppInner /></AuthProvider>;
}
