import React, { createContext, useContext, useState, ReactNode } from 'react';
import { initialRequests, initialDonors } from '../services/mockData';

export type RequestStatus = 'open' | 'pending' | 'completed' | 'canceled';
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
  id: number;
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
  login: (credentials: any, isDemo?: boolean) => void;
  signup: (formData: any) => void;
  logout: () => void;
  applyToRequest: (reqId: number) => void;
  createRequest: (req: Omit<BloodRequest, 'id' | 'date' | 'status' | 'unitsFulfilled' | 'applicants' | 'applications'>) => void;
  updateRequest: (reqId: number, reqData: Partial<BloodRequest>) => void;
  deleteRequest: (reqId: number) => void;
  updateApplicationStatus: (reqId: number, donorId: number, newStatus: ApplicationStatus) => void;
  cancelApplication: (reqId: number, reason: string) => void;
  notifications: NotificationItem[];
  addNotification: (notif: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationsRead: () => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<BloodRequest[]>(initialRequests as BloodRequest[]);
  const [donors, setDonors] = useState<Donor[]>(initialDonors);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const [user, setUser] = useState<Donor | null>(null);
  const isAuthenticated = !!user;
  const currentUser = user || donors[0];

  const login = (credentials: any, isDemo = false) => {
    let foundUser = donors[0]; // Default mock user
    if (isDemo && credentials.email === 'google_user@demo.com') {
      foundUser = { id: 999, name: 'Google User', units: 50, bloodType: 'O+', phone: '+1 (555) 000-0000' };
    }
    setUser(foundUser);
    addNotification({ recipientId: foundUser.id, message: 'Successfully logged in.' });
  };

  const signup = (formData: any) => {
    const newId = Date.now();
    const newUser: Donor = {
      id: newId,
      name: formData.fullName,
      units: 0,
      bloodType: formData.bloodGroup,
      age: new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear(),
      phone: formData.phone,
    };
    setDonors(prev => [...prev, newUser]);
    setUser(newUser);
    addNotification({ recipientId: newId, message: 'Welcome to BloodPing! Your account has been created.' });
  };

  const logout = () => {
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

  const applyToRequest = (reqId: number) => {
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

  const createRequest = (reqData: Omit<BloodRequest, 'id' | 'date' | 'status' | 'unitsFulfilled' | 'applicants' | 'applications'>) => {
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
  };

  const updateRequest = (reqId: number, reqData: Partial<BloodRequest>) => {
    setRequests(prev => prev.map(req => 
      req.id === reqId ? { ...req, ...reqData } : req
    ));
  };

  const deleteRequest = (reqId: number) => {
    setRequests(prev => prev.filter(req => req.id !== reqId));
  };

  const updateApplicationStatus = (reqId: number, donorId: number, newStatus: ApplicationStatus) => {
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

  const cancelApplication = (reqId: number, reason: string) => {
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
