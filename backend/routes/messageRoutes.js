const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { getChatHistory, markAsRead } = require('../controllers/messageController');

router.use(verifyToken);
router.post('/read', markAsRead);
router.get('/:otherUserId', getChatHistory);

module.exports = router;
