import React, { useState } from 'react';
import { X } from 'lucide-react';
import { registerUser, loginUser } from '../services/api';

export default function AuthModal({ onClose, onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let res;
      if (isLogin) {
        res = await loginUser(username, password);
      } else {
        res = await registerUser(username, password, email);
      }
      onSuccess(res.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{isLogin ? 'Sign In' : 'Create Account'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(null); }}
          >
            Login
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(null); }}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="auth-error">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label className="auth-label">Username</label>
            <input
              className="auth-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. abebe_music"
              required
            />
          </div>

          {!isLogin && (
            <div className="auth-input-group">
              <label className="auth-label">Email (Optional)</label>
              <input
                className="auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="abebe@example.com"
              />
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
