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
      totalGuesses: { type: Number, default: 0 },
      correctGuesses: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      bestStreak: { type: Number, default: 0 },
      gamesPlayed: { type: Number, default: 0 }
    },
    lastPlayedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Custom JSON transformation to omit password from responses
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
