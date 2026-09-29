const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/adminMiddleware');
const { updateProfile, removeUser } = require('../controllers/userController');

router.put('/profile', verifyToken, updateProfile);
router.delete('/:id', verifyToken, isAdmin, removeUser);

module.exports = router;
