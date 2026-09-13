import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../services/supabaseClient';
import apiClient from '../services/apiClient';
import { sessionService } from '../services/sessionService';
import { requestService } from '../services/requestService';
import { useNotifications } from './NotificationContext';

export type RequestStatus = 'open' | 'pending' | 'completed' | 'canceled' | 'cancelled' | 'in_progress' | 'fulfilled' | 'expired';
export type ApplicationStatus = 'pending' | 'accepted' | 'completed' | 'rejected' | 'canceled' | 'confirmed' | 'withdrawn' | 'no_show';

export interface Application {
  id?: string;
  matchId?: string;
  donorId: string | number;
  donorUserId?: string;
  donorProfileId?: string;
  status: ApplicationStatus;
  cancelReason?: string;
  donorName?: string;
  donorPhone?: string;
  bloodGroup?: string;
  appliedAt?: string;
  acceptedAt?: string;
  confirmedAt?: string;
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
  recipientId?: string;
  recipientUserId?: string;
  ownerId?: string;
  isOwner?: boolean;
  hospital: string;
  address?: string;
  ward?: string;
  hospitalLat?: number;
  hospitalLng?: number;
  authorName: string;
  description: string;
  contact?: { phone: string; secondaryPhone?: string; email: string };
  bloodGroup: string;
  unitsFulfilled: number;
  unitsRequired: number;
  distance: number;
  distanceKm?: number;
  matchScore?: number;
  preferredDistance?: number;
  urgent: boolean;
  date: string;
  deadline: string;
  applicants: number;
  applications: Application[];
  status: RequestStatus;
}

export interface Donor {
  id: string | number;
  name: string;
  units: number;
  bloodType: string;
  age?: number;
  occupation?: string;
  lastDonated?: string;
  medicalDocUrl?: string;
  phone?: string;
  email?: string;
  role?: string;
}

interface AppDataContextType {
  requests: BloodRequest[];
  donors: Donor[];
  currentUser: Donor;
  user: Donor | null;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  fetchRequests: (coords?: { lat?: number; lng?: number; radius_km?: number }) => Promise<void>;
  login: (credentials: any, isDemo?: boolean) => Promise<void>;
  signup: (formData: any) => Promise<void>;
  logout: () => Promise<void>;
  applyToRequest: (reqId: string | number) => Promise<void> | void;
  createRequest: (req: Omit<BloodRequest, 'id' | 'date' | 'status' | 'unitsFulfilled' | 'applicants' | 'applications'>) => Promise<void> | void;
  updateRequest: (reqId: string | number, reqData: Partial<BloodRequest>) => Promise<void> | void;
  deleteRequest: (reqId: string | number) => Promise<void> | void;
  updateApplicationStatus: (reqId: string | number, donorId: number | string, newStatus: ApplicationStatus) => Promise<void> | void;
  cancelApplication: (reqId: string | number, reason: string) => Promise<void> | void;
  notifications: NotificationItem[];
  addNotification: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationsRead: () => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const session = useAuthStore(state => state.session);
  const isAuth = useAuthStore(state => state.isAuthenticated);
  const [user, setUser] = useState<Donor | null>(null);
  const { fetchNotifications: syncNotifications } = useNotifications();

  const refreshUser = async () => {
    const currentSession = useAuthStore.getState().session;
    if (!currentSession?.user) {
      setUser(null);
      return;
    }
    try {
      const res = await apiClient.get('/users/me');
      if (res.data) {
        setUser({
          id: currentSession.user.id as any,
          name: res.data.full_name || currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'User',
          units: res.data.total_donations ?? 0,
          bloodType: res.data.blood_group || currentSession.user.user_metadata?.blood_group || '',
          phone: res.data.phone || currentSession.user.phone || '',
          email: res.data.email || currentSession.user.email,
          role: res.data.role || currentSession.user.user_metadata?.role,
        });
      }
    } catch (err) {
      console.debug('Failed to refresh user profile:', err);
    }
  };

  // Sync state from Zustand session & fetch real profile from /users/me
  useEffect(() => {
    let isMounted = true;
    if (session && session.user) {
      const initialUser: Donor = {
        id: session.user.id as any,
        name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
        units: 0,
        bloodType: session.user.user_metadata?.blood_group || '',
        phone: session.user.phone || session.user.user_metadata?.phone || '',
        email: session.user.email,
        role: session.user.user_metadata?.role,
      };
      setUser(initialUser);

      apiClient.get('/users/me')
        .then(res => {
          if (isMounted && res.data) {
            setUser({
              id: session.user.id as any,
              name: res.data.full_name || initialUser.name,
              units: res.data.total_donations ?? 0,
              bloodType: res.data.blood_group || initialUser.bloodType || '',
              phone: res.data.phone || initialUser.phone || '',
              email: res.data.email || initialUser.email,
              role: res.data.role || initialUser.role,
            });
          }
        })
        .catch(err => {
          console.debug('Failed to load user profile in AppDataContext:', err?.message || err);
        });
    } else {
      setUser(null);
    }
    return () => {
      isMounted = false;
    };
  }, [session]);

  const mapRequestItem = (req: any, currentAuthUserId?: string, forceIsOwner = false) => {
    const isOwner = forceIsOwner || req.is_owner || (currentAuthUserId && (
      String(req.recipient_user_id) === String(currentAuthUserId) ||
      String(req.owner_id) === String(currentAuthUserId)
    ));
    return {
      id: req.id,
      recipientId: req.recipient_id,
      recipientUserId: req.recipient_user_id,
      ownerId: req.owner_id || req.recipient_user_id,
      isOwner: Boolean(isOwner),
      hospital: req.hospital_name || req.hospital,
      address: req.hospital_address || req.address,
      hospitalLat: req.hospital_lat || req.hospitalLat,
      hospitalLng: req.hospital_lng || req.hospitalLng,
      ward: req.ward || '',
      authorName: req.recipient_name || req.authorName || 'Anonymous Recipient',
      description: req.notes || req.description || '',
      contact: {
        phone: req.recipient_phone || req.contact?.phone || '',
        email: req.contact?.email || ''
      },
      bloodGroup: req.blood_group || req.bloodGroup,
      unitsFulfilled: req.units_fulfilled ?? req.unitsFulfilled ?? 0,
      unitsRequired: req.units_required ?? req.unitsRequired ?? 1,
      distance: req.distance_km ?? req.distance ?? 0.0,
      distanceKm: req.distance_km ?? req.distance ?? 0.0,
      matchScore: req.match_score ?? req.matchScore ?? null,
      urgent: req.is_urgent ?? req.urgent ?? false,
      date: req.created_at || req.date,
      deadline: req.required_by || req.deadline,
      applicants: req.applicants || (Array.isArray(req.applications) ? req.applications.length : 0),
      applications: Array.isArray(req.applications) ? req.applications.map((app: any) => ({
        id: app.id || app.matchId,
        matchId: app.matchId || app.id,
        donorId: app.donorId || app.donorUserId,
        donorUserId: app.donorUserId || app.donorId,
        donorProfileId: app.donorProfileId,
        donorName: app.donorName,
        donorPhone: app.donorPhone,
        bloodGroup: app.bloodGroup,
        status: app.status === 'confirmed' ? 'completed' : (app.status === 'withdrawn' ? 'canceled' : app.status),
        cancelReason: app.recipient_verification_note || app.cancelReason,
        appliedAt: app.appliedAt,
        acceptedAt: app.acceptedAt,
        confirmedAt: app.confirmedAt
      })) : [],
      status: req.status
    };
  };

  const fetchRequests = async (coords?: { lat?: number; lng?: number; radius_km?: number }) => {
    try {
      const params: Record<string, any> = {};
      if (coords?.lat !== undefined && coords?.lat !== null) params.lat = coords.lat;
      if (coords?.lng !== undefined && coords?.lng !== null) params.lng = coords.lng;
      if (coords?.radius_km !== undefined) params.radius_km = coords.radius_km;

      const currentAuthUserId = useAuthStore.getState().session?.user?.id;

      const feedPromise = apiClient.get('/requests/feed', { params }).catch((err) => {
        console.warn('Feed fetch error:', err);
        return { data: { success: false, payload: { requests: [] } } };
      });

      const myReqPromise = currentAuthUserId
        ? apiClient.get('/requests/my-requests').catch((err) => {
            console.warn('My requests fetch error:', err);
            return { data: { success: false, payload: { requests: [] } } };
          })
        : Promise.resolve({ data: { success: false, payload: { requests: [] } } });

      const [feedRes, myReqRes] = await Promise.all([feedPromise, myReqPromise]);

      const requestsMap = new Map<string, any>();

      // 1. Process user's own requests first (always marked with isOwner = true)
      if (myReqRes.data && myReqRes.data.success && Array.isArray(myReqRes.data.payload.requests)) {
        myReqRes.data.payload.requests.forEach((req: any) => {
          const item = mapRequestItem(req, currentAuthUserId, true);
          requestsMap.set(String(item.id), item);
        });
      }

      // 2. Process feed requests (merge or add)
      if (feedRes.data && feedRes.data.success && Array.isArray(feedRes.data.payload.requests)) {
        feedRes.data.payload.requests.forEach((req: any) => {
          const idStr = String(req.id);
          const item = mapRequestItem(req, currentAuthUserId);
          if (!requestsMap.has(idStr)) {
            requestsMap.set(idStr, item);
          } else {
            const existing = requestsMap.get(idStr);
            requestsMap.set(idStr, {
              ...existing,
              distance: item.distance,
              distanceKm: item.distanceKm,
              matchScore: item.matchScore,
            });
          }
        });
      }

      setRequests(Array.from(requestsMap.values()));
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
  const currentUser: Donor = user || {
    id: '' as any,
    name: 'Guest',
    units: 0,
    bloodType: '',
    phone: '',
  };

  const login = async (credentials: any, isDemo = false) => {
    if (isDemo) {
      let foundUser: Donor = { id: 999, name: 'Demo User', units: 0, bloodType: 'O+', phone: '+1 (555) 000-0000' };
      if (credentials.email === 'google_user@demo.com') {
        foundUser = { id: 999, name: 'Google User', units: 0, bloodType: 'O+', phone: '+1 (555) 000-0000' };
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
    try {
      await sessionService.logoutSession();
    } catch (err) {
      console.warn('Backend logout notification failed:', err);
    }
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

  const applyToRequest = async (reqId: string | number) => {
    try {
      const authUserId = useAuthStore.getState().session?.user?.id;
      const donorIdParam = authUserId ? String(authUserId) : undefined;
      
      const response = await apiClient.post(`/matches/${reqId}/apply`, {
        donor_id: donorIdParam
      });
      
      if (response.data && response.data.success) {
        await fetchRequests();
        syncNotifications(true).catch(() => {});
        addNotification({
          recipientId: 'recipient',
          message: `Successfully applied to donation request.`
        });
      }
    } catch (err: any) {
      console.error('Failed to apply to request:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to apply to donation request.';
      alert(msg);
      throw err;
    }
  };

  const createRequest = async (reqData: Omit<BloodRequest, 'id' | 'date' | 'status' | 'unitsFulfilled' | 'applicants' | 'applications'>) => {
    try {
      const response = await apiClient.post('/requests/request-blood', {
        blood_group: reqData.bloodGroup,
        units_required: reqData.unitsRequired,
        hospital_name: reqData.hospital,
        hospital_lat: reqData.hospitalLat ?? 23.8103,
        hospital_lng: reqData.hospitalLng ?? 90.4125,
        hospital_address: reqData.address || 'Dhaka',
        search_radius_km: reqData.preferredDistance || 10.0,
        is_urgent: reqData.urgent || false,
        notes: reqData.description,
        required_by: reqData.deadline
      });
      if (response.data && response.data.success) {
        await fetchRequests();
      }
    } catch (err: any) {
      console.error('Failed to create donation request on backend:', err);
      throw err;
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
    } catch (err: any) {
      console.error('Failed to update request on backend:', err);
      throw err;
    }
  };

  const deleteRequest = async (reqId: string | number) => {
    try {
      await requestService.deleteRequest(reqId);
      await fetchRequests();
      addNotification({
        recipientId: 'recipient',
        message: 'Donation request cancelled successfully.',
      });
    } catch (err: any) {
      console.error('Failed to cancel/delete request on backend:', err);
      throw err;
    }
  };

  const updateApplicationStatus = async (reqId: string | number, donorIdOrMatchId: number | string, newStatus: ApplicationStatus) => {
    try {
      const req = requests.find(r => String(r.id) === String(reqId));
      const app = req?.applications.find(a => 
        String(a.matchId) === String(donorIdOrMatchId) ||
        String(a.id) === String(donorIdOrMatchId) ||
        String(a.donorId) === String(donorIdOrMatchId) ||
        String(a.donorUserId) === String(donorIdOrMatchId) ||
        String(a.donorProfileId) === String(donorIdOrMatchId)
      );
      
      const matchId = app?.matchId || app?.id || (typeof donorIdOrMatchId === 'string' && donorIdOrMatchId.length > 20 ? donorIdOrMatchId : null);

      if (!matchId) {
        throw new Error("Unable to identify match ID for application.");
      }

      if (newStatus === 'completed' || newStatus === 'confirmed') {
        await apiClient.post(`/matches/${matchId}/confirm-donation`);
      } else {
        const backendStatus = newStatus === 'canceled' ? 'withdrawn' : newStatus;
        await apiClient.put(`/matches/${matchId}/status`, {
          status: backendStatus
        });
      }

      await fetchRequests();
      syncNotifications(true).catch(() => {});

      addNotification({
        recipientId: app?.donorId || donorIdOrMatchId,
        message: `Application status updated to ${newStatus}.`
      });
    } catch (err: any) {
      console.error('Failed to update application status:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to update application status.';
      alert(msg);
      throw err;
    }
  };

  const cancelApplication = async (reqId: string | number, reason: string) => {
    try {
      const authUserId = useAuthStore.getState().session?.user?.id;
      const req = requests.find(r => String(r.id) === String(reqId));
      const app = req?.applications.find(a => 
        String(a.donorId) === String(authUserId) ||
        String(a.donorUserId) === String(authUserId) ||
        (user && String(a.donorId) === String(user.id))
      );

      const matchId = app?.matchId || app?.id;
      if (!matchId) {
        throw new Error("Application match not found.");
      }

      await apiClient.delete(`/matches/${matchId}/withdraw`);
      await fetchRequests();
      syncNotifications(true).catch(() => {});

      addNotification({
        recipientId: 'recipient',
        message: `Your application for ${req?.hospital || 'the hospital'} was withdrawn. Reason: ${reason}`
      });
    } catch (err: any) {
      console.error('Failed to cancel application:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to withdraw application.';
      alert(msg);
      throw err;
    }
  };

  return (
    <AppDataContext.Provider value={{ 
      requests, donors, currentUser, user, refreshUser, isAuthenticated, fetchRequests, login, signup, logout, applyToRequest, createRequest, updateRequest, deleteRequest, updateApplicationStatus, cancelApplication, notifications, addNotification, markNotificationsRead
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
