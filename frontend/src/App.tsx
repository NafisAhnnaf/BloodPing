import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomeFeed } from './pages/HomeFeed';
import { Leaderboard } from './pages/Leaderboard';
import { DonorProfileStats } from './pages/DonorProfileStats';
import { PostRequestFlow } from './pages/PostRequestFlow';
import { VitalCore } from './pages/VitalCore';
import { BottomNav } from './components/layout/BottomNav';
import { RoleProvider } from './context/RoleContext';
import { AppDataProvider } from './context/AppDataContext';

function App() {
  return (
    <AppDataProvider>
      <RoleProvider>
        <BrowserRouter>
          <div className="pb-24 md:pb-0 min-h-screen">
            <Routes>
              <Route path="/" element={<HomeFeed />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile" element={<DonorProfileStats />} />
              <Route path="/request" element={<PostRequestFlow />} />
              <Route path="/vitals" element={<VitalCore />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <BottomNav />
          </div>
        </BrowserRouter>
      </RoleProvider>
    </AppDataProvider>
  );
}

export default App;
