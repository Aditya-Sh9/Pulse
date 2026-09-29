const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { updateTaskStatus } = require('../controllers/taskController');

router.patch('/:id/status', verifyToken, updateTaskStatus);

module.exports = router;
