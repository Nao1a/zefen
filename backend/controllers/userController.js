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
      gamesPlayed: 0,
      totalPoints: 0,
      level: 1,
      dailyStreak: 0,
      bestDailyStreak: 0,
      lastDailyStreakDate: null
    };

    // Recalculate daily streak validity on profile fetch
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const lastDaily = stats.lastDailyStreakDate || null;

    let activeDailyStreak = stats.dailyStreak || 0;
    // If last play date is not today or yesterday, streak is broken
    if (lastDaily && lastDaily !== todayStr && lastDaily !== yesterdayStr) {
      activeDailyStreak = 0;
    }

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
        gamesPlayed: stats.gamesPlayed,
        totalPoints: stats.totalPoints || 0,
        level: stats.level || 1,
        dailyStreak: activeDailyStreak,
        bestDailyStreak: stats.bestDailyStreak || 0
      },
      friendsCount: (user.friends || []).length,
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
        pointsEarned: s.pointsEarned || 0,
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

async function searchUsers(req, res, next) {
  try {
    const query = req.query.q ? req.query.q.trim() : '';
    if (!query || query.length < 1) {
      return res.status(200).json({ results: [] });
    }

    const currentUserId = req.userId;
    const currentUser = currentUserId ? await User.findById(currentUserId) : null;
    const friendSet = new Set((currentUser?.friends || []).map(id => id.toString()));

    const dbUsers = await User.find({
      _id: { $ne: currentUserId },
      username: { $regex: query, $options: 'i' }
    }).limit(10).lean();

    let results = dbUsers.map(u => {
      const stats = u.stats || {};
      const total = stats.totalGuesses || 0;
      const correct = stats.correctGuesses || 0;
      return {
        id: u._id.toString(),
        username: u.username,
        totalPoints: stats.totalPoints || 0,
        level: stats.level || 1,
        accuracy: total > 0 ? parseFloat((correct / total).toFixed(2)) : 0,
        currentStreak: stats.currentStreak || 0,
        bestStreak: stats.bestStreak || 0,
        gamesPlayed: stats.gamesPlayed || 0,
        dailyStreak: stats.dailyStreak || 0,
        isFriend: friendSet.has(u._id.toString())
      };
    });

    return res.status(200).json({ results });
  } catch (err) {
    next(err);
  }
}

async function addFriend(req, res, next) {
  try {
    const { friendId } = req.body;
    const userId = req.userId;

    if (!friendId) {
      return res.status(400).json({ success: false, error: 'friendId is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!user.friends.includes(friendId)) {
      user.friends.push(friendId);
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Friend added successfully',
      friendsCount: user.friends.length,
      isFriend: true
    });
  } catch (err) {
    next(err);
  }
}

async function removeFriend(req, res, next) {
  try {
    const { friendId } = req.body;
    const userId = req.userId;

    if (!friendId) {
      return res.status(400).json({ success: false, error: 'friendId is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.friends = user.friends.filter(f => f.toString() !== friendId.toString());
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Friend removed',
      friendsCount: user.friends.length,
      isFriend: false
    });
  } catch (err) {
    next(err);
  }
}

async function getFriendsList(req, res, next) {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).populate('friends').lean();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const friendsData = (user.friends || []).map(f => {
      const stats = f.stats || {};
      const total = stats.totalGuesses || 0;
      const correct = stats.correctGuesses || 0;
      return {
        id: f._id.toString(),
        username: f.username,
        totalPoints: stats.totalPoints || 0,
        level: stats.level || 1,
        accuracy: total > 0 ? parseFloat((correct / total).toFixed(2)) : 0,
        currentStreak: stats.currentStreak || 0,
        bestStreak: stats.bestStreak || 0,
        gamesPlayed: stats.gamesPlayed || 0,
        lastPlayedAt: f.lastPlayedAt || f.createdAt,
        isFriend: true
      };
    });

    return res.status(200).json({
      friends: friendsData,
      totalFriends: friendsData.length
    });
  } catch (err) {
    next(err);
  }
}

async function compareUserStats(req, res, next) {
  try {
    const currentUserId = req.userId;
    const { targetUserId } = req.params;

    const currentUser = await User.findById(currentUserId).lean();
    if (!currentUser) {
      return res.status(404).json({ success: false, error: 'Current user not found' });
    }

    let targetUser = await User.findById(targetUserId).lean();

    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'Target user not found for comparison' });
    }

    const formatStats = (u) => {
      const s = u.stats || {};
      const total = s.totalGuesses || 0;
      const correct = s.correctGuesses || 0;
      return {
        id: u._id.toString(),
        username: u.username,
        totalPoints: s.totalPoints || 0,
        level: s.level || 1,
        accuracy: total > 0 ? parseFloat((correct / total).toFixed(2)) : 0,
        currentStreak: s.currentStreak || 0,
        bestStreak: s.bestStreak || 0,
        gamesPlayed: s.gamesPlayed || 0,
        correctGuesses: correct,
        totalGuesses: total,
        dailyStreak: s.dailyStreak || 0
      };
    };

    const me = formatStats(currentUser);
    const opponent = formatStats(targetUser);

    // Calculate Head-to-Head winners for each metric
    const comparison = {
      me,
      opponent,
      metrics: {
        totalPoints: { me: me.totalPoints, opponent: opponent.totalPoints, winner: me.totalPoints >= opponent.totalPoints ? 'me' : 'opponent' },
        accuracy: { me: me.accuracy, opponent: opponent.accuracy, winner: me.accuracy >= opponent.accuracy ? 'me' : 'opponent' },
        currentStreak: { me: me.currentStreak, opponent: opponent.currentStreak, winner: me.currentStreak >= opponent.currentStreak ? 'me' : 'opponent' },
        bestStreak: { me: me.bestStreak, opponent: opponent.bestStreak, winner: me.bestStreak >= opponent.bestStreak ? 'me' : 'opponent' },
        gamesPlayed: { me: me.gamesPlayed, opponent: opponent.gamesPlayed, winner: me.gamesPlayed >= opponent.gamesPlayed ? 'me' : 'opponent' }
      }
    };

    let meWins = 0;
    let oppWins = 0;
    Object.values(comparison.metrics).forEach(m => {
      if (m.winner === 'me') meWins++;
      else oppWins++;
    });

    comparison.summary = {
      meWins,
      oppWins,
      leader: meWins > oppWins ? me.username : oppWins > meWins ? opponent.username : 'Tie'
    };

    return res.status(200).json(comparison);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCurrentUserProfile,
  getUserGameHistory,
  searchUsers,
  addFriend,
  removeFriend,
  getFriendsList,
  compareUserStats
};
