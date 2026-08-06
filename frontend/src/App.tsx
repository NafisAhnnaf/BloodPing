import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FeedPage } from './pages/FeedPage';
import { LandingPage } from './pages/LandingPage';
import { Leaderboard } from './pages/Leaderboard';
import { DonorProfileStats } from './pages/DonorProfileStats';
import { HistoryPage } from './pages/HistoryPage';
import { VitalCore } from './pages/VitalCore';
import { BottomNav } from './components/layout/BottomNav';
import { RoleProvider } from './context/RoleContext';
import { AppDataProvider } from './context/AppDataContext';
import { AuthPage } from './components/ui/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, GuestRoute } from './components/layout/RouteProtection';
import { SetupProfilePage } from './pages/SetupProfilePage';
import { AdminDashboard } from './pages/AdminDashboard';

function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-slate-950 to-rose-950 text-slate-100">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-bold tracking-wider text-rose-200 uppercase animate-pulse">Initializing BloodPing...</p>
      </div>
    );
  }

  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/';

  const bgClass = isAuthPage
    ? "" // Let AuthPage handle its own full-screen background
    : "pb-24 md:pb-0 min-h-screen bg-gradient-to-br from-yellow-100 to-red-200 text-slate-900 antialiased";

  return (
    <div className={bgClass}>
      <Routes>
        {/* Guest Routes */}
        <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />
        <Route path="/login" element={<GuestRoute><AuthPage /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><AuthPage /></GuestRoute>} />

        {/* Protected Routes */}
        <Route path="/setup-profile" element={<ProtectedRoute><SetupProfilePage /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><DonorProfileStats /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/vitals" element={<ProtectedRoute><VitalCore /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/feed" : "/"} replace />} />
      </Routes>
      {isAuthenticated && <BottomNav />}
    </div>
  );
}

function AppContent() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </RoleProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppDataProvider>
        <AppContent />
      </AppDataProvider>
    </AuthProvider>
  );
}

export default App;
