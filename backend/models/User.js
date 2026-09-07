const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20
    },
    usernameLower: {
      type: String,
      index: true,
      trim: true,
      lowercase: true
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    stats: {
      totalGuesses: { type: Number, default: 0, index: true },
      correctGuesses: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      bestStreak: { type: Number, default: 0 },
      gamesPlayed: { type: Number, default: 0 },
      totalPoints: { type: Number, default: 0, index: true },
      level: { type: Number, default: 1 },
      dailyStreak: { type: Number, default: 0 },
      bestDailyStreak: { type: Number, default: 0 },
      lastDailyStreakDate: { type: String, default: null }
    },
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    lastPlayedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// High performance compound indexes for Leaderboard & Search
userSchema.index({ 'stats.totalPoints': -1, 'stats.bestStreak': -1 });
userSchema.index({ usernameLower: 1 });
userSchema.index({ username: 1 });

// Ensure usernameLower is always synchronized on save
userSchema.pre('save', function (next) {
  if (this.username) {
    this.usernameLower = this.username.toLowerCase().trim();
  }
  next();
});

// Custom JSON transformation to omit password from responses
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.usernameLower;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
