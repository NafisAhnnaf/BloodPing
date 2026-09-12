import apiClient from './apiClient';

export interface AdminLoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
  };
}

export interface DonorApplication {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  blood_group: string;
  travel_radius_km: number;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface AdminUserItem {
  id: string;
  full_name: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  phone?: string | null;
  is_banned: boolean;
  ban_reason?: string | null;
  banned_at?: string | null;
  roles: string[];
  is_donor?: boolean;
  is_recipient?: boolean;
  donor_active?: boolean;
  recipient_active?: boolean;
  donor_stats?: {
    blood_group: string;
    total_donations: number;
    total_points: number;
  } | null;
}

export interface PaginatedUsersResponse {
  users: AdminUserItem[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  payload: T;
  message: string;
}

export const adminService = {
  /**
   * Admin Login endpoint (public)
   */
  async adminLogin(email: string, password: string): Promise<ApiResponse<AdminLoginResponse>> {
    const res = await apiClient.post('/admins/login', { email, password });
    return res.data;
  },

  /**
   * Retrieve donor candidate applications with filtering, sorting, and search
   */
  async getApplications(
    status?: string,
    sort?: string,
    search?: string
  ): Promise<ApiResponse<DonorApplication[]>> {
    const res = await apiClient.get('/admins/applications', {
      params: { status, sort, search },
    });
    return res.data;
  },

  /**
   * Review (approve or reject) a donor application
   */
  async reviewApplication(
    id: string,
    status: string,
    rejection_reason?: string
  ): Promise<ApiResponse<any>> {
    const res = await apiClient.post(`/admins/applications/${id}/review`, {
      status,
      rejection_reason,
    });
    return res.data;
  },

  /**
   * Retrieve paginated user accounts with search and status filter
   */
  async getUsers(
    page = 1,
    limit = 20,
    search?: string,
    filter?: string
  ): Promise<ApiResponse<PaginatedUsersResponse>> {
    const res = await apiClient.get('/admins/users', {
      params: { page, limit, search, filter },
    });
    return res.data;
  },

  /**
   * Ban target user account with a reason
   */
  async banUser(userId: string, reason: string): Promise<ApiResponse<any>> {
    const res = await apiClient.post(`/admins/users/${userId}/ban`, { reason });
    return res.data;
  },

  /**
   * Restore/unban target user account
   */
  async unbanUser(userId: string): Promise<ApiResponse<any>> {
    const res = await apiClient.post(`/admins/users/${userId}/unban`);
    return res.data;
  },

  /**
   * Remove donor role from user
   */
  async removeDonorRole(userId: string, reason?: string): Promise<ApiResponse<any>> {
    const res = await apiClient.post(`/admins/users/${userId}/remove-donor`, { reason });
    return res.data;
  },

  /**
   * Remove recipient role from user
   */
  async removeRecipientRole(userId: string, reason?: string): Promise<ApiResponse<any>> {
    const res = await apiClient.post(`/admins/users/${userId}/remove-recipient`, { reason });
    return res.data;
  },
};

export default adminService;
