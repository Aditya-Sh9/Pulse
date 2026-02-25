const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  type: { type: String, default: 'system' }, // 'task', 'project', 'space', 'user', 'system'
  userId: { type: String, required: true }, 
  userName: { type: String, required: true },
  userAvatar: { type: String, required: true },
  metadata: { type: Object, default: {} }
}, { timestamps: true }); // Automatically adds 'createdAt' and 'updatedAt'

// Add a descending index on createdAt to make fetching the latest logs lightning fast
ActivityLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);