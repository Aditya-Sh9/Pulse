const express = require('express');
const router = express.Router();
const { getChatHistory, markAsRead } = require('../controllers/messageController');

router.get('/:userId/:otherUserId', getChatHistory);
router.post('/read', markAsRead);

module.exports = router;