const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, leaderboardController.getLeaderboard);
router.get('/:userId/rank', optionalAuth, leaderboardController.getUserRank);

module.exports = router;
