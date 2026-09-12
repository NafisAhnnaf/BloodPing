import logging
import uuid
from typing import Dict, Any, List, Optional
from app.core.supabase_client import supabase

logger = logging.getLogger(__name__)

class LeaderboardService:
    @staticmethod
    async def get_leaderboard(limit: int = 10, blood_group: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieves the donor leaderboard.
        
        Calls the 'get_donor_leaderboard' PL/pgSQL function via Supabase RPC.
        
        Args:
            limit (int): The maximum number of entries to return (default 10).
            blood_group (Optional[str]): Filter by a specific blood group.
            
        Returns:
            List[Dict[str, Any]]: A list of leaderboard entries containing donor stats and ranks.
        """
        try:
            params: Dict[str, Any] = {"p_limit": limit}
            if blood_group is not None:
                params["p_blood_group"] = blood_group
            else:
                params["p_blood_group"] = None
                
            try:
                response = supabase.rpc('get_donor_leaderboard_with_points', params).execute()
            except Exception:
                response = supabase.rpc('get_donor_leaderboard', params).execute()

            return response.data
        except Exception as e:
            logger.error(f"Error fetching leaderboard via Supabase: {e}")
            raise e

    @staticmethod
    async def get_donor_rank(donor_id: str) -> Dict[str, Any]:
        """
        Retrieves a specific donor's rank and stats.
        
        Calls the 'get_donor_rank' PL/pgSQL function via Supabase RPC.
        
        Args:
            donor_id (str): The unique identifier of the donor.
            
        Returns:
            Dict[str, Any]: The donor's rank and statistics.
        """
        try:
            response = supabase.rpc('get_donor_rank', {'p_donor_id': donor_id}).execute()
            
            # The RPC should return a single object or an array with one object
            data = response.data
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            elif isinstance(data, dict):
                return data
            return {}
        except Exception as e:
            logger.error(f"Error fetching donor rank via Supabase: {e}")
            raise e

    @staticmethod
    async def get_donor_points(donor_id: str) -> Dict[str, Any]:
        """
        Retrieves points summary and transaction history for a specific donor.

        Calls the 'get_donor_points' PL/pgSQL function via Supabase RPC.

        Args:
            donor_id (str): The unique identifier of the donor.

        Returns:
            Dict[str, Any]: Object containing total_points, total_donations, total_penalties,
                            current_streak, and points_history array.
        """
        try:
            response = supabase.rpc('get_donor_points', {'p_donor_id': donor_id}).execute()
            data = response.data
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            elif isinstance(data, dict):
                return data
            return {}
        except Exception as e:
            logger.error(f"Error fetching donor points via Supabase for donor {donor_id}: {e}")
            raise e

    @staticmethod
    async def award_points(
        donor_id: str,
        match_id: Optional[str] = None,
        action_type: str = "DONATION_COMPLETED",
        points: int = 10,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Awards or deducts points for a donor and records the transaction.

        Calls the 'award_points' PL/pgSQL function via Supabase RPC.

        Args:
            donor_id (str): The unique identifier of the donor.
            match_id (Optional[str]): Optional associated donation match ID.
            action_type (str): Type of action (e.g. 'DONATION_COMPLETED', 'CANCELLATION_PENALTY').
            points (int): The points value (positive or negative).
            description (Optional[str]): Optional transaction description.

        Returns:
            Dict[str, Any]: Object containing success status and new total points.
        """
        try:
            params = {
                'p_donor_id': donor_id,
                'p_match_id': match_id,
                'p_action_type': action_type,
                'p_points': points,
                'p_description': description
            }
            response = supabase.rpc('award_points', params).execute()
            data = response.data
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            elif isinstance(data, dict):
                return data
            return {}
        except Exception as e:
            logger.error(f"Error awarding points via Supabase for donor {donor_id}: {e}")
            raise e

    @staticmethod
    async def update_match_status_with_points(
        match_id: str,
        status: str,
        note: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Updates a match status while automatically calculating points and penalties.

        Calls the 'update_match_status_with_points' PL/pgSQL function via Supabase RPC.

        Args:
            match_id (str): The unique identifier of the match.
            status (str): Target match status (e.g. 'accepted', 'confirmed', 'withdrawn', 'no_show', 'rejected').
            note (Optional[str]): Optional verification note.

        Returns:
            Dict[str, Any]: Object containing match_id, status, points_awarded, and new_total.
        """
        try:
            params = {
                'p_match_id': match_id,
                'p_status': status,
                'p_note': note
            }
            response = supabase.rpc('update_match_status_with_points', params).execute()
            data = response.data
            if isinstance(data, list) and len(data) > 0:
                return data[0]
            elif isinstance(data, dict):
                return data
            return {}
        except Exception as e:
            logger.error(f"Error updating match status with points via Supabase for match {match_id}: {e}")
            raise e
