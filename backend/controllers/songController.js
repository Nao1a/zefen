const songService = require('../services/songService');
const GameSession = require('../models/GameSession');
const https = require('https');

function fetchAudioStream(url, reqHeaders, callback, maxRedirects = 5) {
  if (maxRedirects === 0) {
    return callback(new Error('Too many redirects'));
  }
  const headers = {};
  if (reqHeaders.range) {
    headers['Range'] = reqHeaders.range;
  }
  https.get(url, { headers }, (response) => {
    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
      return fetchAudioStream(response.headers.location, reqHeaders, callback, maxRedirects - 1);
    }
    callback(null, response);
  }).on('error', (err) => callback(err));
}

async function getRandomSong(req, res, next) {
  try {
    const { difficulty, exclude } = req.query;
    let excludeIds = [];

    if (exclude) {
      excludeIds = String(exclude)
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));
    }

    if (req.userId) {
      try {
        const userSessions = await GameSession.find({ userId: req.userId }).select('songId');
        const userPlayedIds = userSessions.map((s) => s.songId);
        excludeIds = Array.from(new Set([...excludeIds, ...userPlayedIds]));
      } catch (e) {
        // Fallback to exclude query parameter if DB query fails
      }
    }

    const song = songService.getRandomSong(difficulty, excludeIds);

    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'No songs available',
        statusCode: 404
      });
    }

    return res.status(200).json({
      id: song.id,
      difficulty: song.difficulty,
      snippets: song.snippets
    });
  } catch (err) {
    next(err);
  }
}

function streamSongSnippet(req, res, next) {
  try {
    const { songId, level } = req.params;
    const song = songService.getSongById(songId);

    if (!song || !song.snippets || !song.snippets[level]) {
      return res.status(404).json({
        success: false,
        error: 'Audio snippet not found',
        statusCode: 404
      });
    }

    const audioUrl = song.snippets[level];

    fetchAudioStream(audioUrl, req.headers, (err, remoteRes) => {
      if (err) {
        console.error('Error streaming audio snippet:', err.message);
        if (!res.headersSent) {
          return res.status(500).json({ success: false, error: 'Failed to stream audio' });
        }
        return;
      }

      res.status(remoteRes.statusCode);
      if (remoteRes.headers['content-type']) {
        res.setHeader('Content-Type', remoteRes.headers['content-type']);
      } else {
        res.setHeader('Content-Type', 'audio/mpeg');
      }
      if (remoteRes.headers['content-length']) {
        res.setHeader('Content-Length', remoteRes.headers['content-length']);
      }
      if (remoteRes.headers['content-range']) {
        res.setHeader('Content-Range', remoteRes.headers['content-range']);
      }
      if (remoteRes.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', remoteRes.headers['accept-ranges']);
      }
      res.setHeader('Cache-Control', 'public, max-age=86400');

      remoteRes.pipe(res);
    });
  } catch (err) {
    next(err);
  }
}

function getSongSnippets(req, res, next) {
  try {
    const { songId } = req.params;
    const song = songService.getSongById(songId);

    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found',
        statusCode: 404
      });
    }

    return res.status(200).json({
      songId: song.id,
      snippets: {
        '1.0': `/api/songs/${song.id}/audio/1.0`,
        '2.0': `/api/songs/${song.id}/audio/2.0`,
        '4.0': `/api/songs/${song.id}/audio/4.0`,
        '8.0': `/api/songs/${song.id}/audio/8.0`,
        '10.0': `/api/songs/${song.id}/audio/10.0`,
        'full': `/api/songs/${song.id}/audio/full`
      }
    });
  } catch (err) {
    next(err);
  }
}

function getAllSongs(req, res, next) {
  try {
    const { search, difficulty, limit } = req.query;
    const songs = songService.getAllSongs({ search, difficulty, limit: limit || 100 });

    const formatted = songs.map((s) => ({
      id: s.id,
      artist: s.artist,
      title: s.title,
      album: s.album,
      year: s.year,
      albumArt: s.albumArt || null,
      difficulty: s.difficulty
    }));

    return res.status(200).json({
      songs: formatted,
      total: formatted.length,
      limit: parseInt(limit, 10) || 100
    });
  } catch (err) {
    next(err);
  }
}

function searchSongs(req, res, next) {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query parameter "q" is required and cannot be empty',
        statusCode: 400
      });
    }

    const results = songService.searchSongs(q);

    return res.status(200).json({
      results,
      query: q.trim(),
      count: results.length
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getRandomSong,
  streamSongSnippet,
  getSongSnippets,
  getAllSongs,
  searchSongs
};
