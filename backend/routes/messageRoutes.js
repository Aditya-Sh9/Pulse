const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { getChatHistory, markAsRead, getUnreadCounts } = require('../controllers/messageController');

router.use(verifyToken);
router.post('/read', markAsRead);
router.get('/unread', getUnreadCounts);
router.get('/:otherUserId', getChatHistory);

module.exports = router;
