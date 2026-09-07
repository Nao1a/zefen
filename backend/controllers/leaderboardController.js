const User = require('../models/User');

let memoryLeaderboardCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds in-memory cache

async function getTopGlobalLeaderboard(limit = 100) {
  const isMongoConnected = require('mongoose').connection.readyState === 1;
  if (!isMongoConnected) {
    return memoryLeaderboardCache || [];
  }

  const now = Date.now();
  if (memoryLeaderboardCache && (now - lastCacheTime < CACHE_TTL_MS)) {
    return memoryLeaderboardCache.slice(0, limit);
  }

  try {
    // Fast indexed query on totalPoints
    const topUsers = await User.find({ 'stats.totalGuesses': { $gt: 0 } })
      .select('username stats')
      .sort({ 'stats.totalPoints': -1, 'stats.bestStreak': -1 })
      .limit(100)
      .lean();

    const formatted = topUsers.map((user, idx) => {
      const s = user.stats || {};
      const total = s.totalGuesses || 0;
      const correct = s.correctGuesses || 0;
      return {
        rank: idx + 1,
        userId: user._id.toString(),
        username: user.username,
        totalPoints: s.totalPoints || 0,
        level: s.level || 1,
        accuracy: total > 0 ? parseFloat((correct / total).toFixed(2)) : 0,
        currentStreak: s.currentStreak || 0,
        bestStreak: s.bestStreak || 0,
        correctGuesses: correct,
        totalGuesses: total
      };
    });

    memoryLeaderboardCache = formatted;
    lastCacheTime = now;
    return formatted.slice(0, limit);
  } catch (err) {
    console.error('Leaderboard query error:', err.message);
    return memoryLeaderboardCache || [];
  }
}

async function getLeaderboard(req, res, next) {
  try {
    const limitQuery = parseInt(req.query.limit, 10) || 100;
    const limit = Math.min(Math.max(limitQuery, 1), 100);

    let topPlayers = await getTopGlobalLeaderboard(100);

    // Filter by friends if requested
    if (req.query.type === 'friends' && req.userId && require('mongoose').connection.readyState === 1) {
      try {
        const currentUser = await User.findById(req.userId).select('friends').lean();
        if (currentUser) {
          const friendIds = new Set((currentUser.friends || []).map((f) => f.toString()));
          friendIds.add(currentUser._id.toString());

          topPlayers = topPlayers.filter((player) => friendIds.has(player.userId));
        }
      } catch (e) {}
    }

    const sliced = topPlayers.slice(0, limit);

    return res.status(200).json({
      leaderboard: sliced,
      generatedAt: new Date(lastCacheTime || Date.now()),
      totalPlayers: topPlayers.length
    });
  } catch (err) {
    next(err);
  }
}

async function getUserRank(req, res, next) {
  try {
    const { userId } = req.params;
    const topPlayers = await getTopGlobalLeaderboard(100);

    const playerInLeaderboard = topPlayers.find((p) => p.userId === String(userId));

    if (playerInLeaderboard) {
      return res.status(200).json({
        userId,
        username: playerInLeaderboard.username,
        rank: playerInLeaderboard.rank,
        correctGuesses: playerInLeaderboard.correctGuesses,
        totalGuesses: playerInLeaderboard.totalGuesses,
        accuracy: playerInLeaderboard.accuracy,
        currentStreak: playerInLeaderboard.currentStreak,
        bestStreak: playerInLeaderboard.bestStreak,
        totalPoints: playerInLeaderboard.totalPoints || 0,
        level: playerInLeaderboard.level || 1,
        totalPlayersRanked: topPlayers.length
      });
    }

    const user = await User.findById(userId).select('username stats').lean();
    return res.status(200).json({
      userId,
      username: user ? user.username : 'unknown_user',
      rank: null,
      message: 'User is not in top 100',
      totalPlayersRanked: topPlayers.length
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLeaderboard,
  getUserRank
};
