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
