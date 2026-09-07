// High-speed client-side fuzzy search for Ethiopian songs (supports Latin & Ge'ez script)

function normalizeSearchText(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\s\u1200-\u137F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchSongsClient(songList, query) {
  if (!query || query.trim().length === 0 || !Array.isArray(songList) || songList.length === 0) {
    return [];
  }
  const qClean = normalizeSearchText(query);
  if (!qClean) return [];

  const queryTokens = qClean.split(' ').filter(Boolean);

  const scored = [];
  for (const song of songList) {
    const titleClean = normalizeSearchText(song.title);
    const artistClean = normalizeSearchText(song.artist);
    const albumClean = normalizeSearchText(song.album);
    const combined = `${titleClean} ${artistClean} ${albumClean}`;

    let score = 0;
    let matchType = null;

    // 1. Exact / prefix on Title
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

    // 3. Combined phrase match
    if (combined.includes(qClean)) {
      score += 70;
      matchType = matchType || 'combined_match';
    }

    // 4. Token-based matching
    if (queryTokens.length > 1) {
      const allTokensMatch = queryTokens.every(
        (t) => titleClean.includes(t) || artistClean.includes(t) || albumClean.includes(t)
      );
      if (allTokensMatch) {
        score += 80;
        matchType = matchType || 'token_match';
      }
    } else if (score === 0) {
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
        score
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 12);
}
