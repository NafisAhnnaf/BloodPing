import apiClient from './apiClient';

export interface LeaderboardEntry {
  donor_id: string;
  full_name: string;
  username: string;
  avatar_url?: string;
  blood_group: string;
  total_donations: number;
  current_streak: number;
  longest_streak: number;
  total_points?: number;
  badge?: string;
  last_donation_at?: string;
  rank_overall: number;
  rank_by_blood_group?: number;
}

export interface PointsHistory {
  action_type: string;
  points: number;
  description: string;
  created_at: string;
}

export interface DonorPoints {
  total_points: number;
  total_donations: number;
  total_penalties: number;
  current_streak: number;
  points_history: PointsHistory[];
}

export const LeaderboardService = {
  /**
   * Retrieves the donor leaderboard from the backend.
   * 
   * @param limit The maximum number of entries to fetch (default: 10)
   * @param bloodGroup Optional blood group to filter the leaderboard by
   * @returns A promise resolving to an array of LeaderboardEntry objects
   */
  async getLeaderboard(limit: number = 10, bloodGroup?: string): Promise<LeaderboardEntry[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (bloodGroup) {
      params.append('blood_group', bloodGroup);
    }
    
    const response = await apiClient.get(`/leaderboard?${params.toString()}`);
    // The backend returns { success: boolean, payload: [...] }
    return response.data.payload;
  },

  /**
   * Retrieves the gamification stats and rank for a specific donor.
   * 
   * @param donorId The unique identifier of the donor
   * @returns A promise resolving to the donor's LeaderboardEntry details
   */
  async getDonorRank(donorId: string): Promise<LeaderboardEntry> {
    const response = await apiClient.get(`/leaderboard/donor/${donorId}`);
    // The backend returns { success: boolean, payload: {...} }
    return response.data.payload;
  },

  /**
   * Retrieves points summary and recent history for a specific donor.
   * 
   * @param donorId The unique identifier of the donor
   * @returns A promise resolving to the donor's DonorPoints
   */
  async getDonorPoints(donorId: string): Promise<DonorPoints> {
    const response = await apiClient.get(`/leaderboard/points/${donorId}`);
    // The backend returns { success: boolean, payload: {...} }
    return response.data.payload;
  },

  /**
   * Manually awards or deducts points for a donor (Admin only).
   * 
   * @param donorId Target donor ID
   * @param matchId Associated donation match ID (optional)
   * @param actionType Action type string
   * @param points Points to award or deduct
   * @param description Description text (optional)
   * @returns A promise resolving to the API response payload
   */
  async awardPoints(
    donorId: string,
    matchId?: string,
    actionType: string = 'DONATION_COMPLETED',
    points: number = 10,
    description?: string
  ): Promise<any> {
    const response = await apiClient.post('/leaderboard/points/award', {
      donor_id: donorId,
      match_id: matchId,
      action_type: actionType,
      points,
      description
    });
    return response.data.payload;
  }
};
