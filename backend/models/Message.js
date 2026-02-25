const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  text: { type: String, required: true },
  read: { type: Boolean, default: false },
  chatId: { type: String, required: true }
}, { timestamps: true });

MessageSchema.index({ chatId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', MessageSchema);