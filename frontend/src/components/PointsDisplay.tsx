import React, { useEffect, useState } from 'react';
import { Award, Flame, AlertTriangle, TrendingUp, TrendingDown, Clock, RefreshCw, Sparkles, ShieldAlert } from 'lucide-react';
import { LeaderboardService, DonorPoints, PointsHistory } from '../services/leaderboardService';

interface PointsDisplayProps {
  donorId: string;
}

export const PointsDisplay: React.FC<PointsDisplayProps> = ({ donorId }) => {
  const [pointsData, setPointsData] = useState<DonorPoints | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPointsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await LeaderboardService.getDonorPoints(donorId);
      setPointsData(data);
    } catch (err: any) {
      console.error('Error loading donor points:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to load points details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (donorId) {
      fetchPointsData();
    }
  }, [donorId]);

  const getBadgeInfo = (points: number) => {
    if (points >= 500) return { label: '🥇 GOLD', color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    if (points >= 200) return { label: '🥈 SILVER', color: 'bg-slate-300/10 text-slate-300 border-slate-400/30' };
    if (points >= 100) return { label: '🥉 BRONZE', color: 'bg-amber-700/10 text-amber-600 border-amber-700/30' };
    if (points >= 50)  return { label: '⭐ RISING STAR', color: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
    if (points >= 10)  return { label: '💚 ACTIVE', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    return { label: '🌱 NEW', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' };
  };

  const formatActionType = (actionType: string): string => {
    return actionType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl animate-pulse space-y-6">
        <div className="h-8 bg-slate-800/60 rounded-lg w-48 mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-800/40 rounded-xl"></div>
          <div className="h-24 bg-slate-800/40 rounded-xl"></div>
          <div className="h-24 bg-slate-800/40 rounded-xl"></div>
        </div>
        <div className="h-40 bg-slate-800/40 rounded-xl"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-950/20 border border-rose-900/40 rounded-2xl p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <h4 className="text-rose-200 font-semibold text-lg mb-1">Failed to Load Points</h4>
        <p className="text-rose-400/80 text-sm mb-4">{error}</p>
        <button
          onClick={fetchPointsData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-sm font-medium border border-rose-500/30 transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  if (!pointsData) return null;

  const badge = getBadgeInfo(pointsData.total_points || 0);
  const recentHistory = (pointsData.points_history || []).slice(0, 10);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-6 shadow-2xl">
      {/* Header & Total Points */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-1">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Donor Rewards & Points</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500">
              {pointsData.total_points.toLocaleString()}
            </span>
            <span className="text-slate-400 text-base font-semibold">pts</span>
          </div>
        </div>

        {/* Badge Pill */}
        <div>
          <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-bold border tracking-wider uppercase shadow-sm ${badge.color}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Donations */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Total Donations</div>
            <div className="text-xl font-bold text-slate-100">{pointsData.total_donations}</div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Current Streak</div>
            <div className="text-xl font-bold text-slate-100">{pointsData.current_streak} 🔥</div>
          </div>
        </div>

        {/* Total Penalties */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Penalties</div>
            <div className="text-xl font-bold text-slate-100">{pointsData.total_penalties}</div>
          </div>
        </div>
      </div>

      {/* Recent Points History (Last 10) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> Recent Points History
          </h4>
          <span className="text-xs text-slate-500">Last 10 transactions</span>
        </div>

        {recentHistory.length === 0 ? (
          <div className="bg-slate-800/20 border border-slate-800 rounded-xl p-6 text-center text-slate-500 text-sm">
            No points history recorded yet.
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
            {recentHistory.map((item: PointsHistory, index: number) => {
              const isPositive = item.points > 0;
              const isNegative = item.points < 0;

              return (
                <div
                  key={index}
                  className="bg-slate-800/30 hover:bg-slate-800/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isPositive ? 'bg-emerald-500/10 text-emerald-400' : isNegative ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-700/50 text-slate-400'
                    }`}>
                      {isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : isNegative ? (
                        <TrendingDown className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">
                        {formatActionType(item.action_type)}
                      </div>
                      {item.description && (
                        <div className="text-xs text-slate-400 truncate">{item.description}</div>
                      )}
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(item.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Points Badge */}
                  <div className="shrink-0">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        isPositive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isNegative
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-slate-700/30 text-slate-400 border-slate-700/50'
                      }`}
                    >
                      {isPositive ? `+${item.points}` : item.points} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PointsDisplay;
