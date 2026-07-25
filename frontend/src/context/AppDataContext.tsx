import React, { createContext, useContext, useState, ReactNode } from 'react';
import { initialRequests, initialDonors } from '../services/mockData';

export type RequestStatus = 'open' | 'pending' | 'completed' | 'canceled';

export interface BloodRequest {
  id: number;
  hospital: string;
  authorName: string;
  description: string;
  bloodGroup: string;
  unitsFulfilled: number;
  unitsRequired: number;
  distance: number;
  urgent: boolean;
  date: string;
  deadline: string;
  applicants: number;
  status: RequestStatus;
}

export interface Donor {
  id: number;
  name: string;
  units: number;
  bloodType: string;
}

interface AppDataContextType {
  requests: BloodRequest[];
  donors: Donor[];
  donateToRequest: (reqId: number) => void;
  createRequest: (req: Omit<BloodRequest, 'id' | 'date' | 'status' | 'unitsFulfilled' | 'applicants'>) => void;
  updateRequestStatus: (reqId: number, status: RequestStatus) => void;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<BloodRequest[]>(initialRequests as BloodRequest[]);
  const [donors, setDonors] = useState<Donor[]>(initialDonors);

  const donateToRequest = (reqId: number) => {
    setRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        const newUnits = req.unitsFulfilled + 1;
        const newStatus = newUnits >= req.unitsRequired ? 'completed' : 'pending';
        return { ...req, unitsFulfilled: newUnits, status: newStatus, applicants: req.applicants + 1 };
      }
      return req;
    }));
    
    // Increment the active user's score in the leaderboard (assuming current user is Donor ID 1)
    setDonors(prev => prev.map(donor => 
      donor.id === 1 ? { ...donor, units: donor.units + 1 } : donor
    ));
  };

  const createRequest = (reqData: Omit<BloodRequest, 'id' | 'date' | 'status' | 'unitsFulfilled' | 'applicants'>) => {
    const newReq: BloodRequest = {
      ...reqData,
      id: Date.now(),
      date: new Date().toISOString(),
      status: 'open',
      unitsFulfilled: 0,
      applicants: 0
    };
    setRequests(prev => [newReq, ...prev]);
  };

  const updateRequestStatus = (reqId: number, status: RequestStatus) => {
    setRequests(prev => prev.map(req => 
      req.id === reqId ? { ...req, status } : req
    ));
  };

  return (
    <AppDataContext.Provider value={{ requests, donors, donateToRequest, createRequest, updateRequestStatus }}>
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
