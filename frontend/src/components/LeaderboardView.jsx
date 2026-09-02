import React, { useEffect, useState } from 'react';
import { getLeaderboardApi } from '../services/api';

export default function LeaderboardView() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await getLeaderboardApi(100);
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div>
      <h1 className="page-title">Leaderboard</h1>

      {loading ? (
        <div className="loading-text">Loading rankings...</div>
      ) : error ? (
        <div className="error-banner">{error}</div>
      ) : leaderboard.length === 0 ? (
        <div className="empty-state">No ranked players yet. Be the first to guess!</div>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Accuracy</th>
              <th>Streak</th>
              <th>Guesses</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player) => (
              <tr key={player.userId}>
                <td>
                  <span className="rank-num">{player.rank}</span>
                </td>
                <td style={{ fontWeight: 700 }}>{player.username}</td>
                <td style={{ color: 'var(--success)', fontWeight: 700 }}>
                  {(player.accuracy * 100).toFixed(0)}%
                </td>
                <td style={{ fontWeight: 700 }}>
                  {player.currentStreak}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {player.correctGuesses}/{player.totalGuesses}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
