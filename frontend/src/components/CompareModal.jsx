import React, { useEffect, useState } from 'react';
import { X, Swords, Trophy, Flame, Target, Award, CheckCircle, Zap } from 'lucide-react';
import { compareUserStatsApi } from '../services/api';

export default function CompareModal({ targetUser, onClose, user }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadComparison() {
      if (!targetUser) return;
      try {
        setLoading(true);
        const targetId = targetUser.id || targetUser.userId || targetUser._id;
        const res = await compareUserStatsApi(targetId);
        setData(res);
      } catch (err) {
        setError(err.message || 'Failed to compare stats');
      } finally {
        setLoading(false);
      }
    }
    loadComparison();
  }, [targetUser]);

  if (!targetUser) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content compare-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="compare-header">
          <div className="h2h-title">
            <Swords size={22} className="accent-icon" />
            <span>Head-to-Head Comparison</span>
          </div>
        </div>

        {loading ? (
          <div className="loading-text" style={{ padding: '40px 0' }}>
            Analyzing musical status comparison...
          </div>
        ) : error ? (
          <div className="error-banner">{error}</div>
        ) : data ? (
          <div className="compare-body">
            {/* Fighter VS Header */}
            <div className="vs-banner">
              <div className="vs-player me">
                <div className="avatar-circle me-avatar">
                  {data.me.username.charAt(0).toUpperCase()}
                </div>
                <div className="vs-name">{data.me.username} (You)</div>
                <div className="vs-level-badge">Lvl {data.me.level}</div>
              </div>

              <div className="vs-center">
                <div className="vs-badge">VS</div>
                <div className="vs-status-summary">
                  {data.summary.meWins > data.summary.oppWins ? (
                    <span className="lead-tag me-lead">
                      <Zap size={14} /> You Lead ({data.summary.meWins} - {data.summary.oppWins})
                    </span>
                  ) : data.summary.oppWins > data.summary.meWins ? (
                    <span className="lead-tag opp-lead">
                      Rival Leads ({data.summary.oppWins} - {data.summary.meWins})
                    </span>
                  ) : (
                    <span className="lead-tag tie-lead">Tied Battle!</span>
                  )}
                </div>
              </div>

              <div className="vs-player opponent">
                <div className="avatar-circle opp-avatar">
                  {data.opponent.username.charAt(0).toUpperCase()}
                </div>
                <div className="vs-name">{data.opponent.username}</div>
                <div className="vs-level-badge">Lvl {data.opponent.level}</div>
              </div>
            </div>

            {/* Stat Breakdown Rows */}
            <div className="comparison-metrics">
              {/* Metric 1: Total Points */}
              <div className="metric-row">
                <div className={`metric-val me-val ${data.metrics.totalPoints.winner === 'me' ? 'winner' : ''}`}>
                  {data.me.totalPoints.toLocaleString()} pts
                  {data.metrics.totalPoints.winner === 'me' && <Award size={14} className="win-crown" />}
                </div>
                <div className="metric-label">
                  <Trophy size={14} /> Total Points
                </div>
                <div className={`metric-val opp-val ${data.metrics.totalPoints.winner === 'opponent' ? 'winner' : ''}`}>
                  {data.opponent.totalPoints.toLocaleString()} pts
                  {data.metrics.totalPoints.winner === 'opponent' && <Award size={14} className="win-crown" />}
                </div>
              </div>

              {/* Metric 2: Accuracy */}
              <div className="metric-row">
                <div className={`metric-val me-val ${data.metrics.accuracy.winner === 'me' ? 'winner' : ''}`}>
                  {(data.me.accuracy * 100).toFixed(0)}%
                  {data.metrics.accuracy.winner === 'me' && <CheckCircle size={14} className="win-crown" />}
                </div>
                <div className="metric-label">
                  <Target size={14} /> Accuracy
                </div>
                <div className={`metric-val opp-val ${data.metrics.accuracy.winner === 'opponent' ? 'winner' : ''}`}>
                  {(data.opponent.accuracy * 100).toFixed(0)}%
                  {data.metrics.accuracy.winner === 'opponent' && <CheckCircle size={14} className="win-crown" />}
                </div>
              </div>

              {/* Metric 3: Current Streak */}
              <div className="metric-row">
                <div className={`metric-val me-val ${data.metrics.currentStreak.winner === 'me' ? 'winner' : ''}`}>
                  🔥 {data.me.currentStreak}
                  {data.metrics.currentStreak.winner === 'me' && <Flame size={14} className="win-crown" />}
                </div>
                <div className="metric-label">
                  <Flame size={14} /> Active Streak
                </div>
                <div className={`metric-val opp-val ${data.metrics.currentStreak.winner === 'opponent' ? 'winner' : ''}`}>
                  🔥 {data.opponent.currentStreak}
                  {data.metrics.currentStreak.winner === 'opponent' && <Flame size={14} className="win-crown" />}
                </div>
              </div>

              {/* Metric 4: Best Streak */}
              <div className="metric-row">
                <div className={`metric-val me-val ${data.metrics.bestStreak.winner === 'me' ? 'winner' : ''}`}>
                  ⚡ {data.me.bestStreak}
                </div>
                <div className="metric-label">
                  Best Streak
                </div>
                <div className={`metric-val opp-val ${data.metrics.bestStreak.winner === 'opponent' ? 'winner' : ''}`}>
                  ⚡ {data.opponent.bestStreak}
                </div>
              </div>

              {/* Metric 5: Games Played */}
              <div className="metric-row">
                <div className={`metric-val me-val ${data.metrics.gamesPlayed.winner === 'me' ? 'winner' : ''}`}>
                  {data.me.gamesPlayed} games
                </div>
                <div className="metric-label">
                  Games Played
                </div>
                <div className={`metric-val opp-val ${data.metrics.gamesPlayed.winner === 'opponent' ? 'winner' : ''}`}>
                  {data.opponent.gamesPlayed} games
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
