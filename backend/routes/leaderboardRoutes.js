const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/adminMiddleware');
const { closeSeason } = require('../controllers/seasonController');

router.post('/seasons', verifyToken, isAdmin, closeSeason);

module.exports = router;
