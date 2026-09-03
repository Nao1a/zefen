const songService = require('../services/songService');
const GameSession = require('../models/GameSession');
const User = require('../models/User');

const VALID_SNIPPET_LEVELS = ['1.0', '2.0', '4.0', '8.0', '10.0'];

async function submitGuess(req, res, next) {
  try {
    const { songId, guess, guessSongId, snippetLevel, timeSpentSeconds } = req.body;
    const userId = req.userId;

    if (!songId || isNaN(parseInt(songId, 10))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing songId',
        statusCode: 400
      });
    }

    if (!guess || typeof guess !== 'string' || guess.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Guess text must be a non-empty string',
        statusCode: 400
      });
    }

    if (!snippetLevel || !VALID_SNIPPET_LEVELS.includes(String(snippetLevel))) {
      return res.status(400).json({
        success: false,
        error: `snippetLevel must be one of: ${VALID_SNIPPET_LEVELS.join(', ')}`,
        statusCode: 400
      });
    }

    const numericSongId = parseInt(songId, 10);
    const song = songService.getSongById(numericSongId);

    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found',
        statusCode: 404
      });
    }

    // Check guess correctness (Song Title must match; artist alone is not enough)
    const normalize = (s) => (s || '')
      .toLowerCase()
      .replace(/[^\w\s\u1200-\u137F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const cleanGuess = normalize(guess);
    const cleanTitle = normalize(song.title);
    const cleanArtist = normalize(song.artist);
    const cleanCombo1 = normalize(`${song.title} ${song.artist}`);
    const cleanCombo2 = normalize(`${song.artist} ${song.title}`);

    let isCorrect = false;

    // 1. Direct song ID match
    if (guessSongId && parseInt(guessSongId, 10) === numericSongId) {
      isCorrect = true;
    }
    // 2. Exact Title match
    else if (cleanGuess === cleanTitle) {
      isCorrect = true;
    }
    // 3. Exact Combo match (e.g. "Teyim Nat - Tilahun Gessesse")
    else if (cleanGuess === cleanCombo1 || cleanGuess === cleanCombo2) {
      isCorrect = true;
    }
    // 4. Substring Title match (ensuring it's not just the artist name)
    else if (
      cleanTitle.length >= 3 &&
      (cleanGuess.includes(cleanTitle) || cleanTitle.includes(cleanGuess)) &&
      cleanGuess !== cleanArtist
    ) {
      isCorrect = true;
    }

    const timeSeconds = parseInt(timeSpentSeconds, 10) || 0;
    let userStatsResponse = null;
    let pointsEarned = 0;

    const BASE_POINTS_MAP = { '1.0': 1000, '2.0': 750, '4.0': 500, '8.0': 250, '10.0': 100 };
    const DIFFICULTY_MULT_MAP = { hard: 1.5, medium: 1.2, easy: 1.0 };

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        const currentStats = user.stats || {
          totalGuesses: 0,
          correctGuesses: 0,
          currentStreak: 0,
          bestStreak: 0,
          gamesPlayed: 0,
          totalPoints: 0,
          level: 1
        };

        const totalGuesses = (currentStats.totalGuesses || 0) + 1;
        const gamesPlayed = (currentStats.gamesPlayed || 0) + 1;
        let correctGuesses = currentStats.correctGuesses || 0;
        let currentStreak = currentStats.currentStreak || 0;
        let bestStreak = currentStats.bestStreak || 0;
        let totalPoints = currentStats.totalPoints || 0;

        if (isCorrect) {
          correctGuesses += 1;
          // Points formula: base * diffMult * streakBonus
          const basePts = BASE_POINTS_MAP[String(snippetLevel)] || 500;
          const diffMult = DIFFICULTY_MULT_MAP[song.difficulty] || 1.0;
          const streakBonus = 1 + (currentStreak * 0.10); // +10% for existing streak
          pointsEarned = Math.round(basePts * diffMult * streakBonus);

          totalPoints += pointsEarned;
          currentStreak += 1;
          if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
          }
        } else {
          currentStreak = 0;
          pointsEarned = 0;
        }

        const calculatedLevel = Math.floor(Math.sqrt(totalPoints / 250)) + 1;

        // Daily streak calculation
        const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        let dailyStreak = currentStats.dailyStreak || 0;
        let bestDailyStreak = currentStats.bestDailyStreak || 0;
        const lastDailyDate = currentStats.lastDailyStreakDate || null;

        if (lastDailyDate !== todayStr) {
          // Check if the last play was yesterday
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().slice(0, 10);

          if (lastDailyDate === yesterdayStr) {
            // Consecutive day — extend the streak
            dailyStreak += 1;
          } else {
            // Gap in play — reset streak to 1
            dailyStreak = 1;
          }

          if (dailyStreak > bestDailyStreak) {
            bestDailyStreak = dailyStreak;
          }
        }
        // If lastDailyDate === todayStr, the user already played today — no change

        user.stats = {
          totalGuesses,
          correctGuesses,
          currentStreak,
          bestStreak,
          gamesPlayed,
          totalPoints,
          level: calculatedLevel,
          dailyStreak,
          bestDailyStreak,
          lastDailyStreakDate: todayStr
        };
        user.lastPlayedAt = new Date();

        await user.save();

        // Record game session
        await GameSession.create({
          userId,
          songId: numericSongId,
          guess: guess.trim(),
          isCorrect,
          snippetLevelAtGuess: String(snippetLevel),
          timeToGuessSeconds: timeSeconds,
          revealedAnswer: false,
          pointsEarned
        });

        const accuracy = totalGuesses > 0 ? parseFloat((correctGuesses / totalGuesses).toFixed(2)) : 0;
        userStatsResponse = {
          correctGuesses,
          totalGuesses,
          accuracy,
          currentStreak,
          bestStreak,
          gamesPlayed,
          totalPoints,
          pointsEarned,
          level: calculatedLevel,
          dailyStreak,
          bestDailyStreak
        };
      }
    }

    return res.status(200).json({
      correct: isCorrect,
      pointsEarned,
      song: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        year: song.year,
        albumArt: song.albumArt || null,
        fullAudioUrl: `/api/songs/${song.id}/audio/full`,
        difficulty: song.difficulty
      },
      userStats: userStatsResponse
    });
  } catch (err) {
    next(err);
  }
}

async function revealAnswer(req, res, next) {
  try {
    const { songId, snippetLevel } = req.body;
    const userId = req.userId;

    if (!songId || isNaN(parseInt(songId, 10))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing songId',
        statusCode: 400
      });
    }

    const numericSongId = parseInt(songId, 10);
    const song = songService.getSongById(numericSongId);

    if (!song) {
      return res.status(404).json({
        success: false,
        error: 'Song not found',
        statusCode: 404
      });
    }

    const level = snippetLevel && VALID_SNIPPET_LEVELS.includes(String(snippetLevel))
      ? String(snippetLevel)
      : '1.0';

    if (userId) {
      // Record game session for reveal
      await GameSession.create({
        userId,
        songId: numericSongId,
        guess: null,
        isCorrect: false,
        snippetLevelAtGuess: level,
        timeToGuessSeconds: 0,
        revealedAnswer: true
      });

      // Update User stats
      const user = await User.findById(userId);
      if (user) {
        const currentStats = user.stats || {
          totalGuesses: 0,
          correctGuesses: 0,
          currentStreak: 0,
          bestStreak: 0,
          gamesPlayed: 0
        };

        user.stats = {
          ...currentStats,
          totalGuesses: (currentStats.totalGuesses || 0) + 1,
          currentStreak: 0
        };
        user.lastPlayedAt = new Date();
        await user.save();
      }
    }

    return res.status(200).json({
      song: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        year: song.year,
        albumArt: song.albumArt || null,
        fullAudioUrl: `/api/songs/${song.id}/audio/full`,
        difficulty: song.difficulty
      },
      message: 'Better luck next time!'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  submitGuess,
  revealAnswer
};
