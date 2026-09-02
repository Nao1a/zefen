import React from 'react';
import { Music2, Play, Trophy, User, LogIn, LogOut, Flame, Menu, X } from 'lucide-react';

export default function Sidebar({
  activeView,
  onNavigate,
  user,
  currentStreak,
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
          <h1>Zefen</h1>
          <span>Ethiopian Music Game</span>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeView === 'game' ? 'active' : ''}`}
            onClick={() => { onNavigate('game'); onClose(); }}
          >
            <Play size={16} />
            Play Game
          </button>
          <button
            className={`nav-item ${activeView === 'leaderboard' ? 'active' : ''}`}
            onClick={() => { onNavigate('leaderboard'); onClose(); }}
          >
            <Trophy size={16} />
            Leaderboard
          </button>
          {user && (
            <button
              className={`nav-item ${activeView === 'profile' ? 'active' : ''}`}
              onClick={() => { onNavigate('profile'); onClose(); }}
            >
              <User size={16} />
              Profile
            </button>
          )}
        </nav>

        {/* Streak */}
        <div className="sidebar-streak">
          <Flame size={16} />
          <span>Streak</span>
          <strong>{currentStreak}</strong>
        </div>

        {/* Footer — auth */}
        <div className="sidebar-footer">
          {user ? (
            <>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                {user.username}
              </div>
              <button
                className="nav-item"
                onClick={() => { onLogout(); onClose(); }}
                style={{ color: 'var(--error)' }}
              >
                <LogOut size={16} />
                Log Out
              </button>
            </>
          ) : (
            <button
              className="nav-item"
              onClick={() => { onOpenAuth(); onClose(); }}
            >
              <LogIn size={16} />
              Sign In
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
