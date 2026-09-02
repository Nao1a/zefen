const LeaderboardCache = require('../models/LeaderboardCache');
const User = require('../models/User');

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function recalculateLeaderboard() {
  const allUsers = await User.find({ 'stats.totalGuesses': { $gt: 0 } }).lean();

  const formattedUsers = allUsers.map((user) => {
    const total = user.stats ? user.stats.totalGuesses || 0 : 0;
    const correct = user.stats ? user.stats.correctGuesses || 0 : 0;
    const currentStreak = user.stats ? user.stats.currentStreak || 0 : 0;
    const bestStreak = user.stats ? user.stats.bestStreak || 0 : 0;
    const accuracy = total > 0 ? parseFloat((correct / total).toFixed(2)) : 0;

    return {
      userId: user._id,
      username: user.username,
      correctGuesses: correct,
      totalGuesses: total,
      accuracy,
      currentStreak,
      bestStreak
    };
  });

  // Sort by accuracy descending, then by bestStreak descending
  formattedUsers.sort((a, b) => {
    if (b.accuracy !== a.accuracy) {
      return b.accuracy - a.accuracy;
    }
    return b.bestStreak - a.bestStreak;
  });

  const top100 = formattedUsers.slice(0, 100).map((player, index) => ({
    ...player,
    rank: index + 1
  }));

  const cacheDoc = await LeaderboardCache.findOneAndUpdate(
    { cacheKey: 'current' },
    {
      topPlayers: top100,
      lastUpdatedAt: new Date(),
      totalPlayersOnLeaderboard: formattedUsers.length
    },
    { upsert: true, new: true }
  );

  return cacheDoc;
}

async function getLeaderboardData() {
  let cache = await LeaderboardCache.findOne({ cacheKey: 'current' });

  const now = new Date().getTime();
  const isStale = !cache || (now - new Date(cache.lastUpdatedAt).getTime()) > CACHE_TTL_MS;

  if (isStale) {
    cache = await recalculateLeaderboard();
  }

  return cache;
}

async function getLeaderboard(req, res, next) {
  try {
    const limitQuery = parseInt(req.query.limit, 10) || 100;
    const limit = Math.min(Math.max(limitQuery, 1), 100);

    const cache = await getLeaderboardData();

    const topPlayers = cache.topPlayers.slice(0, limit);

    return res.status(200).json({
      leaderboard: topPlayers,
      generatedAt: cache.lastUpdatedAt,
      totalPlayers: cache.totalPlayersOnLeaderboard
    });
  } catch (err) {
    next(err);
  }
}

async function getUserRank(req, res, next) {
  try {
    const { userId } = req.params;
    const cache = await getLeaderboardData();

    const playerInLeaderboard = cache.topPlayers.find(
      (p) => p.userId.toString() === userId.toString()
    );

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
        totalPlayersRanked: cache.totalPlayersOnLeaderboard
      });
    }

    // Check if user exists in db
    const user = await User.findById(userId);
    return res.status(200).json({
      userId,
      username: user ? user.username : 'unknown_user',
      rank: null,
      message: 'User is not in top 100',
      totalPlayersRanked: cache.totalPlayersOnLeaderboard
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getLeaderboard,
  getUserRank
};
