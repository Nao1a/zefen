const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'zefen-ethiopian-music-game-secret-key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

async function register(req, res, next) {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
        statusCode: 400
      });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Username must be between 3 and 20 characters',
        statusCode: 400
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long',
        statusCode: 400
      });
    }

    // Case-insensitive duplicate check
    const existingUser = await User.findOne({
      username: { $regex: new RegExp(`^${trimmedUsername}$`, 'i') }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Username already taken',
        statusCode: 409
      });
    }

    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: 'Email already in use',
          statusCode: 409
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: trimmedUsername,
      email: email ? email.toLowerCase().trim() : undefined,
      password: hashedPassword,
      stats: {
        totalGuesses: 0,
        correctGuesses: 0,
        currentStreak: 0,
        bestStreak: 0,
        gamesPlayed: 0
      }
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email || null,
        stats: newUser.stats
      }
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
        statusCode: 400
      });
    }

    const user = await User.findOne({
      username: { $regex: new RegExp(`^${username.trim()}$`, 'i') }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        statusCode: 401
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        statusCode: 401
      });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email || null,
        stats: user.stats
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login
};
