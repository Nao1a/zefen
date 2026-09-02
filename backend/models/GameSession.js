const mongoose = require('mongoose');

const gameSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    songId: {
      type: Number,
      required: true
    },
    guess: {
      type: String,
      default: null
    },
    isCorrect: {
      type: Boolean,
      required: true,
      default: false
    },
    snippetLevelAtGuess: {
      type: String,
      enum: ['1.0', '2.0', '4.0', '8.0', '10.0'],
      required: true
    },
    timeToGuessSeconds: {
      type: Number,
      default: 0
    },
    revealedAnswer: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

gameSessionSchema.index({ userId: 1, createdAt: -1 });
gameSessionSchema.index({ songId: 1 });

module.exports = mongoose.model('GameSession', gameSessionSchema);
