import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your .env file.'
  );
}

// Global API call counter and logger
let supabaseCallCount = 0;
const apiCallLogs: Array<{ timestamp: string; url: string; method?: string }> = [];

export const getSupabaseCallCount = () => supabaseCallCount;
export const getSupabaseCallLogs = () => apiCallLogs;
export const resetSupabaseCallCount = () => {
  supabaseCallCount = 0;
  apiCallLogs.length = 0;
};

// Expose helpers globally for browser DevTools auditing
if (typeof window !== 'undefined') {
  (window as any).getSupabaseCallCount = getSupabaseCallCount;
  (window as any).getSupabaseCallLogs = getSupabaseCallLogs;
  (window as any).resetSupabaseCallCount = resetSupabaseCallCount;
}

// Custom fetch wrapper to intercept and log all Supabase network calls
const trackingFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  supabaseCallCount++;
  const url = typeof input === 'string' 
    ? input 
    : input instanceof URL 
      ? input.toString() 
      : (input as Request).url || input.toString();
  const method = init?.method || 'GET';
  
  apiCallLogs.push({
    timestamp: new Date().toISOString(),
    url,
    method
  });
  
  console.log(`[Supabase API Call #${supabaseCallCount}] ${method} ${url}`);
  return fetch(input, init);
};

// Create and export the Supabase client instance with the tracking fetch
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key', 
  {
    global: {
      fetch: trackingFetch,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

