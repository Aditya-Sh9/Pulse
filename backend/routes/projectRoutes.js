const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const isAdmin = require('../middleware/adminMiddleware');
const { deleteProject } = require('../controllers/workspaceController');

router.delete('/:id', verifyToken, isAdmin, deleteProject);

module.exports = router;
