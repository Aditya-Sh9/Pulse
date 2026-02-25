const express = require('express');
const router = express.Router();

// Import the controller functions
const { createActivity, getActivities } = require('../controllers/activityController');

// Map endpoints to controller functions
router.post('/', createActivity);
router.get('/', getActivities);

module.exports = router;