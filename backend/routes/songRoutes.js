const express = require('express');
const router = express.Router();
const songController = require('../controllers/songController');
const { optionalAuth } = require('../middleware/auth');

router.get('/random', optionalAuth, songController.getRandomSong);
router.get('/search', songController.searchSongs);
router.get('/:songId/snippets', songController.getSongSnippets);
router.get('/:songId/audio/:level', songController.streamSongSnippet);
router.get('/', songController.getAllSongs);

module.exports = router;
