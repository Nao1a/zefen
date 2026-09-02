const fs = require('fs');
const path = require('path');

let SONGS_CACHE = [];

function loadSongsMetadata() {
  const possiblePaths = [
    path.join(__dirname, '../../songs_metadata.json'),
    path.join(__dirname, '../songs_metadata.json'),
    path.join(process.cwd(), 'songs_metadata.json')
  ];

  let filePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.error('ERROR: Cannot load songs_metadata.json. File not found.');
    process.exit(1);
  }

  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);

    if (!Array.isArray(parsed)) {
      throw new Error('songs_metadata.json must contain an array of songs');
    }

    // Validate song structure
    parsed.forEach((song, idx) => {
      if (!song.id || !song.artist || !song.title || !song.snippets) {
        throw new Error(`Song at index ${idx} is missing required fields (id, artist, title, snippets)`);
      }
      const requiredSnippets = ['1.0', '2.0', '4.0', '8.0', '10.0', 'full'];
      for (const reqKey of requiredSnippets) {
        if (!song.snippets[reqKey]) {
          throw new Error(`Song ID ${song.id} missing snippet level: ${reqKey}`);
        }
      }
    });

    SONGS_CACHE = parsed;
    console.log(`Successfully loaded ${SONGS_CACHE.length} songs from ${filePath}`);
    return SONGS_CACHE;
  } catch (err) {
    console.error('ERROR reading songs_metadata.json:', err.message);
    process.exit(1);
  }
}

function getSongById(id) {
  const numericId = parseInt(id, 10);
  return SONGS_CACHE.find((s) => s.id === numericId) || null;
}

function getAllSongs(filters = {}) {
  let results = [...SONGS_CACHE];

  if (filters.difficulty) {
    results = results.filter(
      (s) => s.difficulty && s.difficulty.toLowerCase() === filters.difficulty.toLowerCase()
    );
  }

  if (filters.search) {
    const q = filters.search.toLowerCase().trim();
    results = results.filter(
      (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
  }

  if (filters.limit) {
    const limitNum = parseInt(filters.limit, 10);
    if (!isNaN(limitNum) && limitNum > 0) {
      results = results.slice(0, Math.min(limitNum, 500));
    }
  }

  return results;
}

function getRandomSong(difficulty = null, excludeIds = []) {
  let pool = SONGS_CACHE;
  if (difficulty) {
    const filtered = pool.filter(
      (s) => s.difficulty && s.difficulty.toLowerCase() === difficulty.toLowerCase()
    );
    if (filtered.length > 0) {
      pool = filtered;
    }
  }
  if (pool.length === 0) return null;

  const excludeSet = new Set(excludeIds.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id)));
  let unplayedPool = pool.filter((s) => !excludeSet.has(s.id));

  // If all songs in the pool have been played, reset exclusion to keep game going
  if (unplayedPool.length === 0) {
    unplayedPool = pool;
  }

  const randomIndex = Math.floor(Math.random() * unplayedPool.length);
  const targetSong = unplayedPool[randomIndex];

  return {
    id: targetSong.id,
    difficulty: targetSong.difficulty,
    snippets: {
      '1.0': `/api/songs/${targetSong.id}/audio/1.0`,
      '2.0': `/api/songs/${targetSong.id}/audio/2.0`,
      '4.0': `/api/songs/${targetSong.id}/audio/4.0`,
      '8.0': `/api/songs/${targetSong.id}/audio/8.0`,
      '10.0': `/api/songs/${targetSong.id}/audio/10.0`,
      'full': `/api/songs/${targetSong.id}/audio/full`
    }
  };
}

function normalizeSearchText(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\s\u1200-\u137F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchSongs(query) {
  if (!query || query.trim().length === 0) {
    return [];
  }
  const qClean = normalizeSearchText(query);
  if (!qClean) return [];

  const queryTokens = qClean.split(' ').filter(Boolean);

  const scored = [];
  for (const song of SONGS_CACHE) {
    const titleClean = normalizeSearchText(song.title);
    const artistClean = normalizeSearchText(song.artist);
    const albumClean = normalizeSearchText(song.album);
    const combined = `${titleClean} ${artistClean} ${albumClean}`;

    let score = 0;
    let matchType = null;

    // 1. Exact / prefix on Title (Highest priority for song name search)
    if (titleClean === qClean) {
      score += 200;
      matchType = 'title_exact';
    } else if (titleClean.startsWith(qClean)) {
      score += 150;
      matchType = 'title_prefix';
    } else if (titleClean.includes(qClean)) {
      score += 100;
      matchType = 'title_match';
    }

    // 2. Exact / prefix on Artist
    if (artistClean === qClean) {
      score += 120;
      matchType = matchType || 'artist_exact';
    } else if (artistClean.startsWith(qClean)) {
      score += 90;
      matchType = matchType || 'artist_prefix';
    } else if (artistClean.includes(qClean)) {
      score += 60;
      matchType = matchType || 'artist_match';
    }

    // 3. Combined phrase match (e.g. "Tilahun Teyim Nat" or "Teddy Afro Tikur Sew")
    if (combined.includes(qClean)) {
      score += 70;
      matchType = matchType || 'combined_match';
    }

    // 4. Token-based matching (all query words present across title/artist)
    if (queryTokens.length > 1) {
      const allTokensMatch = queryTokens.every(
        (t) => titleClean.includes(t) || artistClean.includes(t) || albumClean.includes(t)
      );
      if (allTokensMatch) {
        score += 80;
        matchType = matchType || 'token_match';
      }
    } else if (score === 0) {
      // Single token partial match
      const token = queryTokens[0];
      if (titleClean.split(' ').some((w) => w.startsWith(token))) {
        score += 85;
        matchType = 'title_word_prefix';
      } else if (artistClean.split(' ').some((w) => w.startsWith(token))) {
        score += 55;
        matchType = 'artist_word_prefix';
      }
    }

    if (score > 0) {
      scored.push({
        id: song.id,
        artist: song.artist,
        title: song.title,
        album: song.album,
        year: song.year,
        albumArt: song.albumArt || null,
        matchType,
        matchedText: query.trim(),
        score
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 12);
}

module.exports = {
  loadSongsMetadata,
  getSongById,
  getAllSongs,
  getRandomSong,
  searchSongs
};
