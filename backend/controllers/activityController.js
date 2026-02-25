const ActivityLog = require('../models/ActivityLog');

// @desc    Create a new activity log
// @route   POST /api/activities
// @access  Public (or authenticated depending on middleware)
exports.createActivity = async (req, res) => {
  try {
    const { action, type, userId, userName, userAvatar, metadata } = req.body;
    
    const newLog = new ActivityLog({ 
      action, 
      type, 
      userId, 
      userName, 
      userAvatar, 
      metadata 
    });
    
    await newLog.save();
    res.status(201).json(newLog);
  } catch (error) {
    console.error('Error logging activity to MongoDB:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Get all activity logs
// @route   GET /api/activities
// @access  Admin
exports.getActivities = async (req, res) => {
  try {
    // Fetch the 150 most recent logs, sorted newest first
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(150);
    res.status(200).json(logs);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Server error' });
  }
};