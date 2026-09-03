import React, { useEffect, useState } from 'react';
import { Trophy, Users, Globe, Swords, Flame, Search, Award } from 'lucide-react';
import { getLeaderboardApi } from '../services/api';

export default function LeaderboardView({ currentUser, onCompare }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [tab, setTab] = useState('global'); // 'global' | 'friends'
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await getLeaderboardApi(100, tab);
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tab]);

  const filteredPlayers = leaderboard.filter((player) =>
    player.username.toLowerCase().includes(filterText.toLowerCase().trim())
  );

  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="medal-icon gold">🥇 1st</span>;
    if (rank === 2) return <span className="medal-icon silver">🥈 2nd</span>;
    if (rank === 3) return <span className="medal-icon bronze">🥉 3rd</span>;
    return <span className="rank-num">#{rank}</span>;
  };

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <div>
          <h1 className="page-title">Leaderboard</h1>
          <p className="page-subtitle">Rankings based on Total Points, Streaks, and Accuracy</p>
        </div>

        {/* Tab selector */}
        <div className="leaderboard-tabs">
          <button
            className={`tab-btn ${tab === 'global' ? 'active' : ''}`}
            onClick={() => setTab('global')}
          >
            <Globe size={15} /> Global Top 100
          </button>
          <button
            className={`tab-btn ${tab === 'friends' ? 'active' : ''}`}
            onClick={() => setTab('friends')}
          >
            <Users size={15} /> Friends Ranking
          </button>
        </div>
      </div>

      {/* Filter search bar */}
      <div className="leaderboard-filter">
        <Search size={16} className="filter-icon" />
        <input
          type="text"
          placeholder="Filter players on leaderboard..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-text">Loading rankings...</div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : filteredPlayers.length === 0 ? (
        <div className="empty-state">
          {tab === 'friends'
            ? 'No friends found on the leaderboard. Add friends in the Friends tab!'
            : 'No players found matching filter.'}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Player</th>
                <th>Points</th>
                <th>Level</th>
                <th>Accuracy</th>
                <th>Streak</th>
                <th>Guesses</th>
                <th style={{ textAlign: 'right' }}>Compare</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => {
                const isCurrentUser = currentUser && (player.userId === currentUser.id || player.userId === currentUser._id);
                return (
                  <tr
                    key={player.userId}
                    className={`${isCurrentUser ? 'current-user-row' : ''} ${player.rank <= 3 ? 'top-three-row' : ''}`}
                  >
                    <td>{getRankBadge(player.rank)}</td>
                    <td>
                      <div className="player-cell">
                        <div className="avatar-circle table-avatar">
                          {player.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="player-name">
                          {player.username} {isCurrentUser && <span className="you-tag">(You)</span>}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="points-cell">
                        {(player.totalPoints || 0).toLocaleString()} pts
                      </span>
                    </td>
                    <td>
                      <span className="level-badge">Lvl {player.level || 1}</span>
                    </td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>
                      {(player.accuracy * 100).toFixed(0)}%
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      <span className="streak-tag">🔥 {player.currentStreak || 0}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {player.correctGuesses}/{player.totalGuesses}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {!isCurrentUser && onCompare && (
                        <button
                          className="btn-small btn-accent-outline"
                          onClick={() => onCompare(player)}
                          title={`Compare status with ${player.username}`}
                        >
                          <Swords size={13} /> Compare
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
