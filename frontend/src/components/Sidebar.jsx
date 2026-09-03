import React from 'react';
import { Play, Trophy, Users, User, LogIn, LogOut, Flame, Github, Globe } from 'lucide-react';

export default function Sidebar({
  activeView,
  onNavigate,
  user,
  currentStreak,
  dailyStreak = 0,
  totalPoints = 0,
  level = 1,
  onOpenAuth,
  onLogout,
  isOpen,
  onClose
}) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <h1 className="sidebar-title">Zefen</h1>
          <span className="sidebar-subtitle">Ethiopian Music Game</span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeView === 'game' ? 'active' : ''}`}
            onClick={() => { onNavigate('game'); onClose(); }}
          >
            <Play size={16} />
            <span>Play Game</span>
          </button>
          <button
            className={`nav-item ${activeView === 'leaderboard' ? 'active' : ''}`}
            onClick={() => { onNavigate('leaderboard'); onClose(); }}
          >
            <Trophy size={16} />
            <span>Leaderboard</span>
          </button>
          <button
            className={`nav-item ${activeView === 'friends' ? 'active' : ''}`}
            onClick={() => { onNavigate('friends'); onClose(); }}
          >
            <Users size={16} />
            <span>Friends & Rivals</span>
          </button>
          {user && (
            <button
              className={`nav-item ${activeView === 'profile' ? 'active' : ''}`}
              onClick={() => { onNavigate('profile'); onClose(); }}
            >
              <User size={16} />
              <span>Profile</span>
            </button>
          )}
        </nav>

        {/* Bottom controls */}
        <div className="sidebar-bottom-area">
          {/* Daily streak pill — logged-in users only */}
          {user && (
            <div className="sidebar-streak-pill">
              <Flame size={16} className="flame-icon-orange" />
              <span className="streak-text">Day Streak</span>
              <strong className="streak-num-orange">{dailyStreak}</strong>
            </div>
          )}

          {/* User / Sign In */}
          <div className="sidebar-auth-row">
            {user ? (
              <div className="user-status-pill">
                <div className="user-avatar-mini">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <span className="user-name-text">{user.username}</span>
                  <span className="user-level-text">Lvl {level}</span>
                </div>
                <button
                  className="btn-mini-logout"
                  onClick={() => { onLogout(); onClose(); }}
                  title="Sign Out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                className="btn-sidebar-signin"
                onClick={() => { onOpenAuth(); onClose(); }}
              >
                <LogIn size={16} />
                <span>Sign In</span>
              </button>
            )}
          </div>

          {/* Creator Credits */}
          <div className="sidebar-credits">
            <div className="credits-header">
              Made by <span className="credits-author">nao1a</span>
            </div>
            <div className="credits-links">
              <a
                href="https://github.com/Nao1a"
                target="_blank"
                rel="noopener noreferrer"
                className="credits-link-btn"
                title="nao1a on GitHub"
              >
                <Github size={13} />
                <span>GitHub</span>
              </a>
              <span className="credits-divider">•</span>
              <a
                href="https://portfolio-eta-drab-12.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="credits-link-btn"
                title="nao1a Portfolio"
              >
                <Globe size={13} />
                <span>Portfolio</span>
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

