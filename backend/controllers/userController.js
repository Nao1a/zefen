const User = require('../models/User');
const GameSession = require('../models/GameSession');
const songService = require('../services/songService');

async function getCurrentUserProfile(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        statusCode: 404
      });
    }

    const stats = user.stats || {
      totalGuesses: 0,
      correctGuesses: 0,
      currentStreak: 0,
      bestStreak: 0,
      gamesPlayed: 0
    };

    const accuracy = stats.totalGuesses > 0
      ? parseFloat((stats.correctGuesses / stats.totalGuesses).toFixed(2))
      : 0;

    return res.status(200).json({
      id: user._id,
      username: user.username,
      email: user.email || null,
      stats: {
        totalGuesses: stats.totalGuesses,
        correctGuesses: stats.correctGuesses,
        accuracy,
        currentStreak: stats.currentStreak,
        bestStreak: stats.bestStreak,
        gamesPlayed: stats.gamesPlayed
      },
      lastPlayedAt: user.lastPlayedAt || user.createdAt
    });
  } catch (err) {
    next(err);
  }
}

async function getUserGameHistory(req, res, next) {
  try {
    const limitQuery = parseInt(req.query.limit, 10) || 20;
    const limit = Math.min(Math.max(limitQuery, 1), 100);

    const total = await GameSession.countDocuments({ userId: req.userId });
    const sessions = await GameSession.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit);

    const history = sessions.map((s) => {
      const song = songService.getSongById(s.songId);
      return {
        id: s._id,
        songId: s.songId,
        songTitle: song ? song.title : 'Unknown Song',
        artist: song ? song.artist : 'Unknown Artist',
        isCorrect: s.isCorrect,
        guess: s.guess,
        snippetLevel: s.snippetLevelAtGuess,
        revealedAnswer: s.revealedAnswer,
        timeToGuessSeconds: s.timeToGuessSeconds,
        createdAt: s.createdAt
      };
    });

    return res.status(200).json({
      history,
      total,
      limit,
      returned: history.length
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCurrentUserProfile,
  getUserGameHistory
};
