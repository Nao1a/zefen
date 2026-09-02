const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('zefen_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function registerUser(username, password, email) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  if (data.token) {
    localStorage.setItem('zefen_token', data.token);
  }
  return data;
}

export async function loginUser(username, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  if (data.token) {
    localStorage.setItem('zefen_token', data.token);
  }
  return data;
}

export function logoutUser() {
  localStorage.removeItem('zefen_token');
}

export async function getRandomSong(difficulty = null, excludeIds = []) {
  const queryParams = new URLSearchParams();
  if (difficulty) queryParams.append('difficulty', difficulty);
  if (excludeIds && excludeIds.length > 0) {
    queryParams.append('exclude', excludeIds.join(','));
  }
  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE}/songs/random?${queryString}` : `${API_BASE}/songs/random`;
  const res = await fetch(url, {
    headers: getAuthHeader()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch random song');
  return data;
}

export async function getSongSnippets(songId) {
  const res = await fetch(`${API_BASE}/songs/${songId}/snippets`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch snippets');
  return data;
}

export async function searchSongsApi(query) {
  if (!query || query.trim().length === 0) return [];
  const res = await fetch(`${API_BASE}/songs/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!res.ok) return [];
  return data.results || [];
}

export async function submitGuessApi(songId, guess, snippetLevel, timeSpentSeconds = 5, guessSongId = null) {
  const res = await fetch(`${API_BASE}/game/guess`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ songId, guess, snippetLevel, timeSpentSeconds, guessSongId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit guess');
  return data;
}

export async function revealAnswerApi(songId, snippetLevel) {
  const res = await fetch(`${API_BASE}/game/reveal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader()
    },
    body: JSON.stringify({ songId, snippetLevel })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to reveal answer');
  return data;
}

export async function getUserProfileApi() {
  const res = await fetch(`${API_BASE}/user/me`, {
    headers: getAuthHeader()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch user profile');
  return data;
}

export async function getUserHistoryApi(limit = 20) {
  const res = await fetch(`${API_BASE}/user/history?limit=${limit}`, {
    headers: getAuthHeader()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch user history');
  return data;
}

export async function getLeaderboardApi(limit = 100) {
  const res = await fetch(`${API_BASE}/leaderboard?limit=${limit}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch leaderboard');
  return data;
}

export async function getUserRankApi(userId) {
  const res = await fetch(`${API_BASE}/leaderboard/${userId}/rank`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch user rank');
  return data;
}
