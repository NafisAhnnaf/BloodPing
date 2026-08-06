import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../services/apiClient';
import { useAuth } from './AuthContext';

type Role = 'donor' | 'recipient';
type ApplicationStatus = 'pending' | 'rejected' | 'not_applied' | 'approved';

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  isDonorApproved: boolean;
  donorApplicationStatus: ApplicationStatus;
  rejectionReason: string | null;
  loadingStatus: boolean;
  refreshRoleStatus: () => Promise<void>;
  systemRole: string | null;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [role, setRoleState] = useState<Role>('recipient');
  const [isDonorApproved, setIsDonorApproved] = useState(false);
  const [donorApplicationStatus, setDonorApplicationStatus] = useState<ApplicationStatus>('not_applied');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [systemRole, setSystemRole] = useState<string | null>(null);

  const refreshRoleStatus = async () => {
    if (!isAuthenticated) return;
    setLoadingStatus(true);
    try {
      // 1. Get system role from /users/me
      const meRes = await apiClient.get('/users/me');
      const userRole = meRes.data.role; // 'admin', 'both', 'donor', 'recipient'
      setSystemRole(userRole);
      const approved = userRole === 'donor' || userRole === 'both' || userRole === 'admin';
      setIsDonorApproved(approved);
      
      if (approved) {
        setDonorApplicationStatus('approved');
        setRoleState('donor'); // Switch to donor if approved
      } else {
        setRoleState('recipient');
        // 2. If not approved, check application status from /donors/status
        const appRes = await apiClient.get('/donors/status');
        if (appRes.data.has_applied) {
          setDonorApplicationStatus(appRes.data.status); // 'pending' or 'rejected'
          setRejectionReason(appRes.data.rejection_reason);
        } else {
          setDonorApplicationStatus('not_applied');
          setRejectionReason(null);
        }
      }
    } catch (err) {
      console.error('Error refreshing role status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshRoleStatus();
    } else {
      setIsDonorApproved(false);
      setDonorApplicationStatus('not_applied');
      setRoleState('recipient');
    }
  }, [isAuthenticated]);

  const setRole = async (newRole: Role) => {
    setLoadingStatus(true);
    try {
      if (newRole === 'donor') {
        try {
          await apiClient.get('/donors/me');
          setIsDonorApproved(true);
          setDonorApplicationStatus('approved');
        } catch (err: any) {
          setIsDonorApproved(false);
          if (err.response?.status === 404) {
            try {
              const appRes = await apiClient.get('/donors/status');
              if (appRes.data.has_applied) {
                setDonorApplicationStatus(appRes.data.status);
                setRejectionReason(appRes.data.rejection_reason);
              } else {
                setDonorApplicationStatus('not_applied');
                setRejectionReason(null);
              }
            } catch (statusErr) {
              setDonorApplicationStatus('not_applied');
            }
          }
        }
      } else {
        try {
          await apiClient.get('/recipients/me');
        } catch (err) {
          console.error('Error verifying recipient presence:', err);
        }
      }
      setRoleState(newRole);
    } catch (err) {
      console.error('Error switching role:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  return (
    <RoleContext.Provider value={{ 
      role, 
      setRole, 
      isDonorApproved, 
      donorApplicationStatus, 
      rejectionReason, 
      loadingStatus,
      refreshRoleStatus,
      systemRole
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
