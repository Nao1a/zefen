const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

router.get('/me', authenticateToken, userController.getCurrentUserProfile);
router.get('/history', authenticateToken, userController.getUserGameHistory);

module.exports = router;
