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
import { AdminLogin } from './pages/admin/AdminLogin';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { Suspended } from './pages/Suspended';
import { BecomeDonorScreen } from './components/ui/BecomeDonorScreen';
import { NotificationProvider } from './context/NotificationContext';
import { NotificationToastStack } from './components/ui/NotificationToastStack';
import { NotificationsPage } from './pages/NotificationsPage';

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

  const isAdminPage = location.pathname.startsWith('/admin');
  const isSuspendedPage = location.pathname === '/suspended';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/' || isSuspendedPage || isAdminPage;

  const bgClass = isAuthPage
    ? "" // Let Auth/Admin/Suspended pages handle their own background
    : "pb-24 md:pb-0 min-h-screen bg-gradient-to-br from-yellow-100 to-red-200 text-slate-900 antialiased";

  return (
    <div className={bgClass}>
      <Routes>
        {/* Guest & Special Routes */}
        <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />
        <Route path="/login" element={<GuestRoute><AuthPage /></GuestRoute>} />
        <Route path="/signup" element={<GuestRoute><AuthPage /></GuestRoute>} />
        <Route path="/suspended" element={<Suspended />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Protected User Routes */}
        <Route path="/setup-profile" element={<ProtectedRoute><SetupProfilePage /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><FeedPage /></ProtectedRoute>} />
        <Route path="/become-donor" element={<ProtectedRoute><BecomeDonorScreen /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><DonorProfileStats /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
        <Route path="/vitals" element={<ProtectedRoute><VitalCore /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/feed" : "/"} replace />} />
      </Routes>
      {isAuthenticated && !isAdminPage && !isSuspendedPage && <BottomNav />}
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
      <NotificationProvider>
        <AppDataProvider>
          <AppContent />
          <NotificationToastStack />
        </AppDataProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
