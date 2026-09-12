import apiClient from './apiClient';

export interface ApiSessionRecord {
  session_id: string;
  ip_address: string;
  mac_address?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
  last_active_at?: string | null;
  is_active: boolean;
  is_current?: boolean;
}

export interface ParsedDeviceInfo {
  deviceName: string;
  deviceType: 'desktop' | 'mobile';
}

/**
 * Parses raw User-Agent strings into human-friendly device names and categories.
 */
export function parseUserAgent(ua?: string | null): ParsedDeviceInfo {
  if (!ua || ua.trim() === '') {
    return { deviceName: 'Unknown Device', deviceType: 'desktop' };
  }

  const lower = ua.toLowerCase();
  let deviceType: 'desktop' | 'mobile' = 'desktop';

  if (
    lower.includes('mobile') ||
    lower.includes('iphone') ||
    lower.includes('ipad') ||
    lower.includes('android')
  ) {
    deviceType = 'mobile';
  }

  // Detect Operating System
  let os = 'Unknown OS';
  if (lower.includes('windows nt 10.0')) os = 'Windows 10/11';
  else if (lower.includes('windows')) os = 'Windows';
  else if (lower.includes('iphone')) os = 'iOS (iPhone)';
  else if (lower.includes('ipad')) os = 'iPadOS';
  else if (lower.includes('macintosh') || lower.includes('mac os x')) os = 'macOS';
  else if (lower.includes('android')) os = 'Android';
  else if (lower.includes('linux')) os = 'Linux';

  // Detect Browser
  let browser = 'Browser';
  if (lower.includes('edg/')) browser = 'Edge';
  else if (lower.includes('chrome/') && !lower.includes('edg/')) browser = 'Chrome';
  else if (lower.includes('safari/') && !lower.includes('chrome/')) browser = 'Safari';
  else if (lower.includes('firefox/')) browser = 'Firefox';
  else if (lower.includes('opr/') || lower.includes('opera/')) browser = 'Opera';

  return {
    deviceName: `${browser} on ${os}`,
    deviceType,
  };
}

/**
 * Formats ISO timestamps into relative or readable times.
 */
export function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return 'Unknown';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Formats ISO timestamps into readable date & time strings.
 */
export function formatSessionDate(dateStr?: string | null): string {
  if (!dateStr) return 'Unknown date';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export const sessionService = {
  /**
   * Retrieves recent session records for the authenticated user.
   */
  async getMySessions(limit = 20): Promise<ApiSessionRecord[]> {
    const res = await apiClient.get('/sessions/me', { params: { limit } });
    return res.data?.payload?.sessions || [];
  },

  /**
   * Records the current active session in the database.
   */
  async recordCurrentSession(macAddress?: string): Promise<{ session_id: string; ip_address: string }> {
    const res = await apiClient.post('/sessions/record', {
      mac_address: macAddress || null,
    });
    return res.data?.payload;
  },

  /**
   * Terminates a specific remote session.
   */
  async terminateSession(sessionId: string): Promise<boolean> {
    const res = await apiClient.post(`/sessions/${sessionId}/terminate`);
    return res.data?.success ?? false;
  },

  /**
   * Verifies the user's password and revokes all other active sessions.
   */
  async terminateAllOtherSessions(password: string): Promise<number> {
    const res = await apiClient.post('/sessions/terminate-all', { password });
    return res.data?.payload?.revoked_count ?? 0;
  },
};
