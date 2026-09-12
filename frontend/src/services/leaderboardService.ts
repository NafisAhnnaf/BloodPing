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
  last_donation_at?: string;
  rank_overall: number;
  rank_by_blood_group?: number;
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
  }
};
