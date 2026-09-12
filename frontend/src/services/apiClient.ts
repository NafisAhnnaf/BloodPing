import axios from 'axios';
import { useAuthStore } from '../stores/authStore';
import { supabase } from './supabaseClient';

const apiBaseUrl = import.meta.env.VITE_API_URL;

if (!apiBaseUrl) {
  console.warn('VITE_API_URL environment variable is not defined.');
}

const apiClient = axios.create({
  baseURL: apiBaseUrl || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to automatically attach JWT Bearer token from the Zustand auth store
apiClient.interceptors.request.use(
  (config) => {
    const session = useAuthStore.getState().session;
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    console.log(`[HTTP Request] ${config.method?.toUpperCase()} ${config.url}`, config.data || '');
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle authentication failures and user suspensions
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[HTTP Response] ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`, response.data);
    return response;
  },
  (error) => {
    console.error(`[HTTP Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} - Status: ${error.response?.status || 'network_error'}`, error.response?.data || error.message);

    // Handle User Suspension (403 Forbidden with is_banned flag)
    if (error.response?.status === 403 && error.response?.data?.is_banned) {
      const banReason = error.response.data.ban_reason || 'Account suspended by administrator.';
      localStorage.setItem('ban_reason', banReason);
      useAuthStore.getState().clearSession();
      supabase.auth.signOut().catch((err) => {
        console.error('Failed to revoke session on Supabase during ban logout:', err);
      });
      if (window.location.pathname !== '/suspended') {
        window.location.href = '/suspended';
      }
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      // Clear token and session if backend rejects the credentials
      useAuthStore.getState().clearSession();
      // Revoke the session on Supabase auth client as well
      supabase.auth.signOut().catch((err) => {
        console.error('Failed to revoke session on Supabase during 401 logout:', err);
      });
    }
    return Promise.reject(error);
  }
);

export default apiClient;
