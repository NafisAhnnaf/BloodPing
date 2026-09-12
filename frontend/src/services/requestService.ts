import apiClient from './apiClient';

export interface BloodRequestPayload {
  blood_group: string;
  units_required: number;
  hospital_name: string;
  hospital_lat?: number;
  hospital_lng?: number;
  hospital_address?: string;
  search_radius_km?: number;
  is_urgent?: boolean;
  notes?: string;
  required_by: string;
}

export interface BloodRequestResponse {
  id: string;
  recipient_id?: string | null;
  recipient_user_id?: string | null;
  owner_id?: string | null;
  is_owner?: boolean;
  blood_group: string;
  units_required: number;
  units_fulfilled: number;
  hospital_name: string;
  hospital_lat?: number | null;
  hospital_lng?: number | null;
  hospital_address?: string | null;
  search_radius_km: number;
  is_urgent: boolean;
  notes?: string | null;
  required_by?: string | null;
  status: string;
  created_at?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  distance?: number;
  distance_km?: number;
  match_score?: number | null;
}

export const requestService = {
  /**
   * Fetch proximity-ranked feed requests based on viewer coordinates.
   */
  async getFeed(params?: {
    lat?: number | null;
    lng?: number | null;
    radius_km?: number;
    blood_group?: string;
    limit?: number;
    offset?: number;
  }): Promise<BloodRequestResponse[]> {
    const cleanParams: Record<string, any> = {};
    if (params?.lat !== undefined && params?.lat !== null) cleanParams.lat = params.lat;
    if (params?.lng !== undefined && params?.lng !== null) cleanParams.lng = params.lng;
    if (params?.radius_km !== undefined) cleanParams.radius_km = params.radius_km;
    if (params?.blood_group && params?.blood_group !== 'All') cleanParams.blood_group = params.blood_group;
    if (params?.limit) cleanParams.limit = params.limit;
    if (params?.offset) cleanParams.offset = params.offset;

    const res = await apiClient.get('/requests/feed', { params: cleanParams });
    if (res.data && res.data.success) {
      return res.data.payload.requests || [];
    }
    return [];
  },

  /**
   * Fetch all donation requests for the feed.
   */
  async getAllRequests(): Promise<BloodRequestResponse[]> {
    const res = await apiClient.get('/requests/get-requests');
    if (res.data && res.data.success) {
      return res.data.payload.requests || [];
    }
    return [];
  },

  /**
   * Fetch only active and open donation requests.
   */
  async getActiveRequests(): Promise<BloodRequestResponse[]> {
    const res = await apiClient.get('/requests/active');
    if (res.data && res.data.success) {
      return res.data.payload.requests || [];
    }
    return [];
  },

  /**
   * Fetch requests created by the authenticated recipient.
   */
  async getMyRequests(): Promise<BloodRequestResponse[]> {
    const res = await apiClient.get('/requests/my-requests');
    if (res.data && res.data.success) {
      return res.data.payload.requests || [];
    }
    return [];
  },

  /**
   * Fetch details for a specific blood donation request.
   */
  async getRequestById(requestId: string | number): Promise<BloodRequestResponse | null> {
    const res = await apiClient.get(`/requests/${requestId}`);
    if (res.data && res.data.success) {
      return res.data.payload.request;
    }
    return null;
  },

  /**
   * Create a new blood donation request.
   */
  async createRequest(payload: BloodRequestPayload): Promise<BloodRequestResponse> {
    const res = await apiClient.post('/requests/request-blood', payload);
    if (res.data && res.data.success) {
      return res.data.payload.request;
    }
    throw new Error(res.data?.message || 'Failed to create blood request');
  },

  /**
   * Update an existing blood donation request.
   */
  async updateRequest(requestId: string | number, payload: BloodRequestPayload): Promise<BloodRequestResponse> {
    const res = await apiClient.put(`/requests/${requestId}`, payload);
    if (res.data && res.data.success) {
      return res.data.payload.request;
    }
    throw new Error(res.data?.message || 'Failed to update blood request');
  },

  /**
   * Cancel an open blood donation request.
   */
  async cancelRequest(requestId: string | number): Promise<BloodRequestResponse> {
    const res = await apiClient.patch(`/requests/${requestId}/cancel`);
    if (res.data && res.data.success) {
      return res.data.payload.request;
    }
    throw new Error(res.data?.message || 'Failed to cancel blood request');
  },

  /**
   * Delete / Cancel a donation request (restricted to owner).
   */
  async deleteRequest(requestId: string | number): Promise<BloodRequestResponse> {
    const res = await apiClient.delete(`/requests/${requestId}`);
    if (res.data && res.data.success) {
      return res.data.payload.request;
    }
    throw new Error(res.data?.message || 'Failed to delete blood request');
  },

  /**
   * Mark a donation request as fulfilled.
   */
  async fulfillRequest(requestId: string | number): Promise<BloodRequestResponse> {
    const res = await apiClient.patch(`/requests/${requestId}/fulfill`);
    if (res.data && res.data.success) {
      return res.data.payload.request;
    }
    throw new Error(res.data?.message || 'Failed to fulfill blood request');
  },

  /**
   * Get live applicant and fulfillment counts for a request.
   */
  async getRequestStatus(requestId: string | number) {
    const res = await apiClient.get(`/requests/${requestId}/status`);
    if (res.data && res.data.success) {
      return res.data.payload.status;
    }
    return null;
  },

  /**
   * Get applicant match history for a request.
   */
  async getRequestHistory(requestId: string | number) {
    const res = await apiClient.get(`/requests/${requestId}/history`);
    if (res.data && res.data.success) {
      return res.data.payload.history || [];
    }
    return [];
  },
};
