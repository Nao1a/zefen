const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { optionalAuth } = require('../middleware/auth');

router.post('/guess', optionalAuth, gameController.submitGuess);
router.post('/reveal', optionalAuth, gameController.revealAnswer);

module.exports = router;
