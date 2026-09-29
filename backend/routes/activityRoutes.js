const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/adminMiddleware');
const { createActivity, getActivities, getXpActivities } = require('../controllers/activityController');

router.post('/', verifyToken, createActivity);
router.get('/xp', verifyToken, getXpActivities);
router.get('/', verifyToken, isAdmin, getActivities);

module.exports = router;
