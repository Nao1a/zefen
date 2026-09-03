import React, { useEffect, useState } from 'react';
import { Trophy, Flame, Zap, Award, Target, Users } from 'lucide-react';
import { getUserProfileApi, getUserHistoryApi } from '../services/api';

function getLevelTitle(level) {
  if (level >= 8) return 'Grand Maestro 👑';
  if (level === 7) return 'Zefen Legend 🌟';
  if (level === 6) return 'Kirar Virtuoso 🎸';
  if (level === 5) return 'Tilahun Aficionado 🎤';
  if (level === 4) return 'Ethio-Groove Master 🎧';
  if (level === 3) return 'Rhythm Fanatic 🎵';
  if (level === 2) return 'Beat Collector 🥁';
  return 'Melodic Explorer 🌱';
}

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

  const userLevel = profile.stats.level || 1;
  const levelTitle = getLevelTitle(userLevel);

  return (
    <div className="profile-container">
      {/* Profile Header */}
      <div className="profile-header-card">
        <div className="avatar-circle profile-avatar">
          {profile.username.charAt(0).toUpperCase()}
        </div>
        <div className="profile-header-info">
          <h1 className="profile-username">{profile.username}</h1>
          <div className="level-badge-container">
            <span className="level-pill">Level {userLevel}</span>
            <span className="level-title-text">{levelTitle}</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="stats-grid">
        <div className="stat-box highlight-stat">
          <div className="stat-num">{(profile.stats.totalPoints || 0).toLocaleString()}</div>
          <div className="stat-lbl"><Trophy size={14} style={{ display: 'inline', marginRight: 4 }} /> Total Points</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{(profile.stats.accuracy * 100).toFixed(0)}%</div>
          <div className="stat-lbl"><Target size={14} style={{ display: 'inline', marginRight: 4 }} /> Accuracy</div>
        </div>
        <div className="stat-box streak-stat">
          <div className="stat-num">🔥 {profile.stats.dailyStreak || 0}</div>
          <div className="stat-lbl">Day Streak</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">⚡ {profile.stats.bestDailyStreak || 0}</div>
          <div className="stat-lbl">Best Day Streak</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{profile.stats.currentStreak}</div>
          <div className="stat-lbl">Guess Streak</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{profile.stats.correctGuesses}</div>
          <div className="stat-lbl">Correct Guesses</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{profile.friendsCount || 0}</div>
          <div className="stat-lbl"><Users size={14} style={{ display: 'inline', marginRight: 4 }} /> Friends</div>
        </div>
      </div>

      {/* Game history */}
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '24px 0 16px 0' }}>Recent Game Activity</h2>

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
                  {item.isCorrect ? `+${item.pointsEarned || 0} pts` : item.revealedAnswer ? 'Revealed' : 'Incorrect'}
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
