import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRole } from '../../context/RoleContext';
import { BecomeDonorScreen } from '../ui/BecomeDonorScreen';

interface RouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: RouteProps) {
  const { isAuthenticated, isLoading, hasProfile } = useAuth();
  const { role, isDonorApproved } = useRole();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-slate-950 to-rose-950 text-slate-100">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-bold tracking-wider text-rose-200 uppercase animate-pulse">Securing session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If authenticated but has no profile, force redirection to setup-profile
  if (hasProfile === false && location.pathname !== '/setup-profile') {
    return <Navigate to="/setup-profile" replace />;
  }

  // If authenticated and has profile, do not allow accessing setup-profile
  if (hasProfile === true && location.pathname === '/setup-profile') {
    return <Navigate to="/feed" replace />;
  }

  // If active role is donor but the donor profile is not verified, redirect to become-donor screen
  if (role === 'donor' && !isDonorApproved && location.pathname !== '/become-donor') {
    return <Navigate to="/become-donor" replace />;
  }

  return <>{children}</>;
}

export function GuestRoute({ children }: RouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-slate-950 to-rose-950 text-slate-100">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-xs font-bold tracking-wider text-rose-200 uppercase animate-pulse">Checking credentials...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/feed" replace />;
  }

  return <>{children}</>;
}
