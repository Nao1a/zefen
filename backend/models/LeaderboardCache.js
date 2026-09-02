const mongoose = require('mongoose');

const playerRankSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    correctGuesses: {
      type: Number,
      default: 0
    },
    totalGuesses: {
      type: Number,
      default: 0
    },
    accuracy: {
      type: Number,
      default: 0
    },
    currentStreak: {
      type: Number,
      default: 0
    },
    bestStreak: {
      type: Number,
      default: 0
    },
    rank: {
      type: Number,
      required: true
    }
  },
  { _id: false }
);

const leaderboardCacheSchema = new mongoose.Schema({
  cacheKey: {
    type: String,
    default: 'current',
    unique: true
  },
  topPlayers: [playerRankSchema],
  lastUpdatedAt: {
    type: Date,
    default: Date.now
  },
  totalPlayersOnLeaderboard: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('LeaderboardCache', leaderboardCacheSchema);
