import React, { createContext, useContext, useState, ReactNode } from 'react';
import { initialRequests, initialDonors } from '../services/mockData';

export type RequestStatus = 'open' | 'pending' | 'completed' | 'canceled';
export type ApplicationStatus = 'pending' | 'accepted' | 'completed' | 'rejected' | 'canceled';

export interface Application {
  donorId: number;
  status: ApplicationStatus;
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
}

interface AppDataContextType {
  requests: BloodRequest[];
  donors: Donor[];
  currentUser: Donor;
  applyToRequest: (reqId: number) => void;
  createRequest: (req: Omit<BloodRequest, 'id' | 'date' | 'status' | 'unitsFulfilled' | 'applicants' | 'applications'>) => void;
  updateRequest: (reqId: number, reqData: Partial<BloodRequest>) => void;
  deleteRequest: (reqId: number) => void;
  updateApplicationStatus: (reqId: number, donorId: number, newStatus: ApplicationStatus) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<BloodRequest[]>(initialRequests as BloodRequest[]);
  const [donors, setDonors] = useState<Donor[]>(initialDonors);
  
  // Hardcode current user to first donor for mock purposes
  const currentUser = donors[0];

  const applyToRequest = (reqId: number) => {
    setRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        // Prevent duplicate applications
        if (req.applications.some(app => app.donorId === currentUser.id)) return req;
        
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
          if (app.donorId === donorId && app.status !== 'completed' && newStatus === 'completed') {
            newUnitsFulfilled += 1;
            
            // Also update the donor's units globally (leaderboard)
            setDonors(prevDonors => prevDonors.map(d => 
              d.id === donorId ? { ...d, units: d.units + 1 } : d
            ));
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

  return (
    <AppDataContext.Provider value={{ requests, donors, currentUser, applyToRequest, createRequest, updateRequest, deleteRequest, updateApplicationStatus }}>
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
