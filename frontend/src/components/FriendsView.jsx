import React, { useState, useEffect } from 'react';
import { Search, UserPlus, UserCheck, Swords, Flame, Trophy, Users, ShieldAlert, Sparkles } from 'lucide-react';
import { searchUsersApi, addFriendApi, removeFriendApi, getFriendsApi } from '../services/api';

export default function FriendsView({ user, onCompare, onOpenAuth }) {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    if (user) {
      loadFriends();
    } else {
      setLoadingFriends(false);
    }
  }, [user]);

  const loadFriends = async () => {
    try {
      setLoadingFriends(true);
      const list = await getFriendsApi();
      setFriends(list);
    } catch (err) {
      console.error('Error loading friends:', err);
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      setIsSearching(true);
      const results = await searchUsersApi(query.trim());
      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleFriend = async (targetUser) => {
    if (!user) {
      onOpenAuth();
      return;
    }

    const targetId = targetUser.id || targetUser._id;
    setActionLoading((prev) => ({ ...prev, [targetId]: true }));

    try {
      if (targetUser.isFriend) {
        await removeFriendApi(targetId);
        // Update local search results & friends list
        setSearchResults((prev) =>
          prev.map((u) => ((u.id || u._id) === targetId ? { ...u, isFriend: false } : u))
        );
        setFriends((prev) => prev.filter((f) => (f.id || f._id) !== targetId));
      } else {
        await addFriendApi(targetId);
        setSearchResults((prev) =>
          prev.map((u) => ((u.id || u._id) === targetId ? { ...u, isFriend: true } : u))
        );
        // Reload friends list to get complete friend details
        loadFriends();
      }
    } catch (err) {
      console.error('Toggle friend error:', err);
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetId]: false }));
    }
  };

  if (!user) {
    return (
      <div className="friends-container">
        <h1 className="page-title">Friends & Rivals</h1>
        <div className="empty-state auth-prompt-card">
          <Users size={48} className="empty-icon" />
          <h2>Connect with Music Enthusiasts</h2>
          <p>Sign in to search friends by username, track their streaks, and compare status Head-to-Head!</p>
          <button className="btn-primary" onClick={onOpenAuth} style={{ marginTop: 16 }}>
            Sign In Now
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="friends-container">
      <div className="friends-header">
        <div>
          <h1 className="page-title">Friends & Rivals</h1>
          <p className="page-subtitle">Search username, build your network, and compare musical status</p>
        </div>
      </div>

      {/* Search Friends Form */}
      <form className="friend-search-bar" onSubmit={handleSearch}>
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search friends by username (e.g., Abebe, BettyG, Teddy)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) setSearchResults([]);
            }}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={isSearching || !query.trim()}>
          {isSearching ? 'Searching...' : 'Find Users'}
        </button>
      </form>

      {/* Search Results Section */}
      {searchResults.length > 0 && (
        <div className="section-block">
          <h2 className="section-title">
            <Sparkles size={16} /> Search Results ({searchResults.length})
          </h2>
          <div className="friends-grid">
            {searchResults.map((person) => {
              const pid = person.id || person._id;
              const isFriend = person.isFriend;
              return (
                <div key={pid} className="friend-card search-result-card">
                  <div className="card-top">
                    <div className="avatar-circle">
                      {person.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="friend-info">
                      <h3>{person.username}</h3>
                      <div className="level-chip">Lvl {person.level || 1}</div>
                    </div>
                  </div>

                  <div className="card-stats">
                    <div>
                      <span className="stat-label">Points</span>
                      <strong className="stat-value">{(person.totalPoints || 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="stat-label">Streak</span>
                      <strong className="stat-value streak-val">🔥 {person.currentStreak || 0}</strong>
                    </div>
                    <div>
                      <span className="stat-label">Accuracy</span>
                      <strong className="stat-value">{(person.accuracy * 100).toFixed(0)}%</strong>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className={`btn-small ${isFriend ? 'btn-secondary' : 'btn-primary'}`}
                      onClick={() => handleToggleFriend(person)}
                      disabled={actionLoading[pid]}
                    >
                      {isFriend ? (
                        <>
                          <UserCheck size={14} /> Friend
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} /> Add Friend
                        </>
                      )}
                    </button>
                    <button
                      className="btn-small btn-accent"
                      onClick={() => onCompare(person)}
                    >
                      <Swords size={14} /> Compare
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Friends List Section */}
      <div className="section-block" style={{ marginTop: 24 }}>
        <h2 className="section-title">
          <Users size={16} /> My Friends Network ({friends.length})
        </h2>

        {loadingFriends ? (
          <div className="loading-text">Loading friends network...</div>
        ) : friends.length === 0 ? (
          <div className="empty-state">
            <UserPlus size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
            <p>You haven't added any friends yet.</p>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Use the search bar above to find friends by username and compare your scores!
            </span>
          </div>
        ) : (
          <div className="friends-grid">
            {friends.map((friend) => {
              const fid = friend.id || friend._id;
              return (
                <div key={fid} className="friend-card">
                  <div className="card-top">
                    <div className="avatar-circle friend-avatar">
                      {friend.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="friend-info">
                      <h3>{friend.username}</h3>
                      <div className="level-chip">Lvl {friend.level || 1}</div>
                    </div>
                  </div>

                  <div className="card-stats">
                    <div>
                      <span className="stat-label">Total Points</span>
                      <strong className="stat-value">{(friend.totalPoints || 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="stat-label">Streak</span>
                      <strong className="stat-value streak-val">🔥 {friend.currentStreak || 0}</strong>
                    </div>
                    <div>
                      <span className="stat-label">Accuracy</span>
                      <strong className="stat-value">{(friend.accuracy * 100).toFixed(0)}%</strong>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className="btn-small btn-accent"
                      onClick={() => onCompare(friend)}
                      title="Compare stats head-to-head"
                    >
                      <Swords size={14} /> Compare H2H
                    </button>
                    <button
                      className="btn-small btn-danger-outline"
                      onClick={() => handleToggleFriend(friend)}
                      disabled={actionLoading[fid]}
                      title="Remove friend"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
