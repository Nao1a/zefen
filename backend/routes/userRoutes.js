const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

router.get('/me', authenticateToken, userController.getCurrentUserProfile);
router.get('/history', authenticateToken, userController.getUserGameHistory);
router.get('/search', authenticateToken, userController.searchUsers);
router.get('/friends', authenticateToken, userController.getFriendsList);
router.post('/friends/add', authenticateToken, userController.addFriend);
router.post('/friends/remove', authenticateToken, userController.removeFriend);
router.get('/compare/:targetUserId', authenticateToken, userController.compareUserStats);

module.exports = router;
