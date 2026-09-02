import React, { useEffect, useState } from 'react';
import { getUserProfileApi, getUserHistoryApi } from '../services/api';

export default function ProfileView() {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [profData, histData] = await Promise.all([
          getUserProfileApi(),
          getUserHistoryApi(20)
        ]);
        setProfile(profData);
        setHistory(histData.history || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="page-title">Profile</h1>
        <div className="loading-text">Loading statistics...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div>
        <h1 className="page-title">Profile</h1>
        <div className="empty-state">Could not load profile data.</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">{profile.username}</h1>

      {/* Stats grid */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-num">{(profile.stats.accuracy * 100).toFixed(0)}%</div>
          <div className="stat-lbl">Accuracy</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{profile.stats.currentStreak}</div>
          <div className="stat-lbl">Current Streak</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{profile.stats.bestStreak}</div>
          <div className="stat-lbl">Best Streak</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{profile.stats.correctGuesses}</div>
          <div className="stat-lbl">Correct</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{profile.stats.totalGuesses}</div>
          <div className="stat-lbl">Total Guesses</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{profile.stats.gamesPlayed}</div>
          <div className="stat-lbl">Games Played</div>
        </div>
      </div>

      {/* Game history */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recent History</h2>

      {history.length === 0 ? (
        <div className="empty-state">No games played yet.</div>
      ) : (
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-item">
              <div>
                <div className="song-name">{item.songTitle}</div>
                <div className="artist-name">{item.artist}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={item.isCorrect ? 'result-correct' : 'result-incorrect'}>
                  {item.isCorrect ? 'Correct' : item.revealedAnswer ? 'Revealed' : 'Incorrect'}
                </span>
                <div className="snippet-info">@ {item.snippetLevel}s</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
