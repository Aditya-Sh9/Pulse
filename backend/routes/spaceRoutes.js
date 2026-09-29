const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/adminMiddleware');
const { deleteSpace } = require('../controllers/workspaceController');

router.delete('/:id', verifyToken, isAdmin, deleteSpace);

module.exports = router;
