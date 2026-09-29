const ActivityLog = require('../models/ActivityLog');
const { getActor } = require('../utils/userInfo');

const ACTIVITY_TYPES = ['task', 'project', 'space', 'user', 'system', 'xp'];

// @desc    Create a new activity log entry, attributed to the authenticated user
// @route   POST /api/activities
// @access  Authenticated
exports.createActivity = async (req, res) => {
  try {
    const { action, type, metadata } = req.body;

    if (typeof action !== 'string' || !action.trim() || action.length > 500) {
      return res.status(400).json({ message: 'Action must be 1-500 characters' });
    }

    let safeMetadata = {};
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      && JSON.stringify(metadata).length <= 2000) {
      safeMetadata = metadata;
    }

    const actor = await getActor(req.user);
    const newLog = await ActivityLog.create({
      action: action.trim(),
      type: ACTIVITY_TYPES.includes(type) ? type : 'system',
      userId: actor.uid,
      userName: actor.name,
      userAvatar: actor.avatar,
      metadata: safeMetadata
    });

    res.status(201).json(newLog);
  } catch (error) {
    console.error('Error logging activity to MongoDB:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get the full audit log
// @route   GET /api/activities
// @access  Admin
exports.getActivities = async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(150);
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching activities:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get recent XP / leaderboard events for the live ticker
// @route   GET /api/activities/xp
// @access  Authenticated
exports.getXpActivities = async (req, res) => {
  try {
    const logs = await ActivityLog.find({ type: 'xp' }).sort({ createdAt: -1 }).limit(20);
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching XP activities:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.logActivity = async (actor, action, type = 'system', metadata = {}) => {
  try {
    return await ActivityLog.create({
      action, type, metadata,
      userId: actor.uid,
      userName: actor.name,
      userAvatar: actor.avatar
    });
  } catch (error) {
    console.error('Error writing server-side activity:', error.message);
    return null;
  }
};
