import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { initialRequests, initialDonors } from '../services/mockData';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../services/supabaseClient';
import apiClient from '../services/apiClient';
import { sessionService } from '../services/sessionService';
import { requestService } from '../services/requestService';

export type RequestStatus = 'open' | 'pending' | 'completed' | 'canceled' | 'cancelled' | 'in_progress' | 'fulfilled' | 'expired';
export type ApplicationStatus = 'pending' | 'accepted' | 'completed' | 'rejected' | 'canceled';

export interface Application {
  donorId: number;
  status: ApplicationStatus;
  cancelReason?: string;
}

export interface NotificationItem {
  id: number;
  recipientId: string | number;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface BloodRequest {
  id: string | number;
  hospital: string;
  address?: string;
  ward?: string;
  authorName: string;
  description: string;
  contact?: { phone: string; secondaryPhone?: string; email: string };
  bloodGroup: string;
  unitsFulfilled: number;
  unitsRequired: number;
  distance: number;
  preferredDistance?: number;
  urgent: boolean;
  date: string;
  deadline: string;
  applicants: number;
  applications: Application[];
  status: RequestStatus;
}

export interface Donor {
  id: number;
  name: string;
  units: number;
  bloodType: string;
  age?: number;
  occupation?: string;
  lastDonated?: string;
  medicalDocUrl?: string;
  phone?: string;
}

interface AppDataContextType {
  requests: BloodRequest[];
  donors: Donor[];
  currentUser: Donor;
  user: Donor | null;
  isAuthenticated: boolean;
  login: (credentials: any, isDemo?: boolean) => Promise<void>;
  signup: (formData: any) => Promise<void>;
  logout: () => Promise<void>;
  applyToRequest: (reqId: string | number) => void;
  createRequest: (req: Omit<BloodRequest, 'id' | 'date' | 'status' | 'unitsFulfilled' | 'applicants' | 'applications'>) => Promise<void> | void;
  updateRequest: (reqId: string | number, reqData: Partial<BloodRequest>) => Promise<void> | void;
  deleteRequest: (reqId: string | number) => Promise<void> | void;
  updateApplicationStatus: (reqId: string | number, donorId: number, newStatus: ApplicationStatus) => void;
  cancelApplication: (reqId: string | number, reason: string) => void;
  notifications: NotificationItem[];
  addNotification: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationsRead: () => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<BloodRequest[]>(initialRequests as BloodRequest[]);
  const [donors, setDonors] = useState<Donor[]>(initialDonors);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const session = useAuthStore(state => state.session);
  const isAuth = useAuthStore(state => state.isAuthenticated);
  const [user, setUser] = useState<Donor | null>(null);

  // Sync state from Zustand session
  useEffect(() => {
    if (session && session.user) {
      setUser({
        id: session.user.id as any,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
        units: 20, // default units
        bloodType: 'O+', // default
        phone: session.user.phone || '',
      });
    } else {
      setUser(null);
    }
  }, [session]);

  const fetchRequests = async () => {
    try {
      const response = await apiClient.get('/requests/get-requests');
      if (response.data && response.data.success) {
        const dbRequests = response.data.payload.requests.map((req: any) => ({
          id: req.id,
          hospital: req.hospital_name,
          address: req.hospital_address,
          ward: '',
          authorName: req.recipient_name || 'Anonymous Recipient',
          description: req.notes || '',
          contact: {
            phone: req.recipient_phone || '',
            email: ''
          },
          bloodGroup: req.blood_group,
          unitsFulfilled: req.units_fulfilled || 0,
          unitsRequired: req.units_required || 1,
          distance: req.distance || 0.0,
          urgent: req.is_urgent || false,
          date: req.created_at,
          deadline: req.required_by,
          applicants: 0,
          applications: [],
          status: req.status
        }));
        setRequests(dbRequests);
      }
    } catch (err) {
      console.error('Failed to fetch requests from backend:', err);
    }
  };

  useEffect(() => {
    if (isAuth) {
      fetchRequests();
      // Record user session audit record in PostgreSQL
      sessionService.recordCurrentSession().catch((err) => {
        console.debug('Session audit tracking:', err?.message || err);
      });
    }
  }, [isAuth]);

  const isAuthenticated = isAuth;
  const currentUser = user || donors[0];

  const login = async (credentials: any, isDemo = false) => {
    if (isDemo) {
      let foundUser = donors[0]; // Default mock user
      if (credentials.email === 'google_user@demo.com') {
        foundUser = { id: 999, name: 'Google User', units: 50, bloodType: 'O+', phone: '+1 (555) 000-0000' };
      }
      setUser(foundUser);
      useAuthStore.getState().setSession({
        access_token: 'mock_token',
        user: { id: foundUser.id.toString(), email: credentials.email, user_metadata: { full_name: foundUser.name } }
      } as any);
      addNotification({ recipientId: foundUser.id, message: 'Successfully logged in as Demo User.' });
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });
    if (error) {
      throw error;
    }
  };

  const signup = async (formData: any) => {
    // 1. Sign up user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
        }
      }
    });
    if (error) {
      throw error;
    }

    // 2. Create the profile in our backend
    if (data.user) {
      try {
        await apiClient.post('/users/', {
          username: formData.username,
          email: formData.email,
          full_name: formData.fullName,
          date_of_birth: formData.dateOfBirth,
          phone: formData.phone,
        });
      } catch (err) {
        console.error('Failed to register profile in backend database:', err);
      }
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().clearSession();
    setUser(null);
  };

  const addNotification = (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => [
      {
        ...notif,
        id: Date.now(),
        timestamp: new Date().toISOString(),
        read: false
      },
      ...prev
    ]);
  };

  const markNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const applyToRequest = (reqId: string | number) => {
    setRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        // Prevent duplicate applications
        if (req.applications.some(app => app.donorId === currentUser.id)) return req;
        
        addNotification({
          recipientId: 'recipient',
          message: `Donor ${currentUser.name} has applied to your request at ${req.hospital}.`
        });

        return { 
          ...req, 
          applicants: req.applicants + 1,
          applications: [...req.applications, { donorId: currentUser.id, status: 'pending' }]
        };
      }
      return req;
    }));
  };

  const createRequest = async (reqData: Omit<BloodRequest, 'id' | 'date' | 'status' | 'unitsFulfilled' | 'applicants' | 'applications'>) => {
    try {
      const response = await apiClient.post('/requests/request-blood', {
        blood_group: reqData.bloodGroup,
        units_required: reqData.unitsRequired,
        hospital_name: reqData.hospital,
        hospital_lat: 0.0,
        hospital_lng: 0.0,
        hospital_address: reqData.address || 'Dhaka',
        search_radius_km: reqData.preferredDistance || 10.0,
        is_urgent: reqData.urgent || false,
        notes: reqData.description,
        required_by: reqData.deadline
      });
      if (response.data && response.data.success) {
        await fetchRequests();
      }
    } catch (err) {
      console.error('Failed to create donation request on backend:', err);
      // Fallback: update in-memory state
      const newReq: BloodRequest = {
        ...reqData,
        id: Date.now(),
        date: new Date().toISOString(),
        status: 'open',
        unitsFulfilled: 0,
        applicants: 0,
        applications: []
      };
      setRequests(prev => [newReq, ...prev]);
    }
  };

  const updateRequest = async (reqId: string | number, reqData: Partial<BloodRequest>) => {
    const current = requests.find(r => r.id === reqId);
    try {
      await requestService.updateRequest(reqId, {
        blood_group: reqData.bloodGroup || current?.bloodGroup || 'A+',
        units_required: reqData.unitsRequired ?? current?.unitsRequired ?? 1,
        hospital_name: reqData.hospital || current?.hospital || 'Hospital',
        hospital_lat: 0.0,
        hospital_lng: 0.0,
        hospital_address: reqData.address ?? current?.address ?? '',
        search_radius_km: reqData.preferredDistance ?? current?.preferredDistance ?? 10.0,
        is_urgent: reqData.urgent ?? current?.urgent ?? false,
        notes: reqData.description ?? current?.description ?? '',
        required_by: reqData.deadline 
          ? new Date(reqData.deadline).toISOString() 
          : (current?.deadline ? new Date(current.deadline).toISOString() : new Date(Date.now() + 86400000).toISOString()),
      });
      await fetchRequests();
      addNotification({
        recipientId: 'recipient',
        message: 'Donation request updated successfully.',
      });
    } catch (err) {
      console.error('Failed to update request on backend:', err);
      // Fallback: local update
      setRequests(prev => prev.map(req => 
        req.id === reqId ? { ...req, ...reqData } : req
      ));
    }
  };

  const deleteRequest = async (reqId: string | number) => {
    try {
      await requestService.cancelRequest(reqId);
      await fetchRequests();
      addNotification({
        recipientId: 'recipient',
        message: 'Donation request cancelled successfully.',
      });
    } catch (err) {
      console.error('Failed to cancel request on backend:', err);
      // Fallback: local remove
      setRequests(prev => prev.filter(req => req.id !== reqId));
    }
  };

  const updateApplicationStatus = (reqId: string | number, donorId: number, newStatus: ApplicationStatus) => {
    setRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        let newUnitsFulfilled = req.unitsFulfilled;
        let newReqStatus = req.status;
        
        const updatedApps = req.applications.map(app => {
          if (app.donorId === donorId && app.status !== newStatus) {
            if (app.status !== 'completed' && newStatus === 'completed') {
              newUnitsFulfilled += 1;
              
              // Also update the donor's units globally (leaderboard)
              setDonors(prevDonors => prevDonors.map(d => 
                d.id === donorId ? { ...d, units: d.units + 10 } : d
              ));

              addNotification({
                recipientId: donorId,
                message: `Your donation at ${req.hospital} was marked as completed. You earned 10 points!`
              });
            } else if (newStatus === 'accepted') {
              addNotification({
                recipientId: donorId,
                message: `Your application to donate at ${req.hospital} has been accepted.`
              });
            } else if (newStatus === 'rejected') {
              addNotification({
                recipientId: donorId,
                message: `Your application to donate at ${req.hospital} was not selected this time.`
              });
            } else if (newStatus === 'canceled') {
              addNotification({
                recipientId: donorId,
                message: `Your acceptance to donate at ${req.hospital} has been canceled by the recipient. No points were deducted.`
              });
            }
          }
          return app.donorId === donorId ? { ...app, status: newStatus } : app;
        });

        if (newUnitsFulfilled >= req.unitsRequired) {
          newReqStatus = 'completed';
        }

        return { ...req, applications: updatedApps, unitsFulfilled: newUnitsFulfilled, status: newReqStatus };
      }
      return req;
    }));
  };

  const cancelApplication = (reqId: string | number, reason: string) => {
    setRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        const app = req.applications.find(a => a.donorId === currentUser.id);
        if (app && app.status === 'accepted') {
          // Deduct 5 points
          setDonors(prevDonors => prevDonors.map(d => 
            d.id === currentUser.id ? { ...d, units: Math.max(0, d.units - 5) } : d
          ));
        }

        // Add Notification
        addNotification({
          recipientId: 'recipient', // Send to the recipient side
          message: `Donor ${currentUser.name} canceled their application for ${req.hospital}. Reason: ${reason}`
        });

        return {
          ...req,
          applications: req.applications.map(a => 
            a.donorId === currentUser.id ? { ...a, status: 'canceled' as ApplicationStatus, cancelReason: reason } : a
          )
        };
      }
      return req;
    }));
  };

  return (
    <AppDataContext.Provider value={{ 
      requests, donors, currentUser, user, isAuthenticated, login, signup, logout, applyToRequest, createRequest, updateRequest, deleteRequest, updateApplicationStatus, cancelApplication, notifications, addNotification, markNotificationsRead
    }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (context === undefined) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
}
