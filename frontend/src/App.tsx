import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FeedPage } from './pages/FeedPage';
import { LandingPage } from './pages/LandingPage';
import { Leaderboard } from './pages/Leaderboard';
import { DonorProfileStats } from './pages/DonorProfileStats';
import { HistoryPage } from './pages/HistoryPage';
import { VitalCore } from './pages/VitalCore';
import { BottomNav } from './components/layout/BottomNav';
import { RoleProvider } from './context/RoleContext';
import { AppDataProvider, useAppData } from './context/AppDataContext';
import { AuthPage } from './components/ui/AuthPage';

function AppLayout() {
  const { isAuthenticated } = useAppData();
  const location = useLocation();

  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/';

  const bgClass = isAuthPage
    ? "" // Let AuthPage handle its own full-screen background
    : "pb-24 md:pb-0 min-h-screen bg-gradient-to-br from-yellow-100 to-red-200 text-slate-900 antialiased";

  return (
    <div className={bgClass}>
      <Routes>
        <Route path="/" element={!isAuthenticated ? <LandingPage /> : <Navigate to="/feed" replace />} />
        <Route path="/login" element={!isAuthenticated ? <AuthPage /> : <Navigate to="/feed" replace />} />
        <Route path="/signup" element={!isAuthenticated ? <AuthPage /> : <Navigate to="/feed" replace />} />
        <Route path="/feed" element={isAuthenticated ? <FeedPage /> : <Navigate to="/login" replace />} />
        <Route path="/leaderboard" element={isAuthenticated ? <Leaderboard /> : <Navigate to="/login" replace />} />
        <Route path="/profile" element={isAuthenticated ? <DonorProfileStats /> : <Navigate to="/login" replace />} />
        <Route path="/history" element={isAuthenticated ? <HistoryPage /> : <Navigate to="/login" replace />} />
        <Route path="/vitals" element={isAuthenticated ? <VitalCore /> : <Navigate to="/login" replace />} />
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
    <AppDataProvider>
      <AppContent />
    </AppDataProvider>
  );
}

export default App;
