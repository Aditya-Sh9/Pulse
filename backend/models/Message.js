const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderId: { type: String, required: true },
  receiverId: { type: String, required: true },
  text: { type: String, required: true },
  read: { type: Boolean, default: false },
  readAt: { type: Date },
  chatId: { type: String, required: true }
}, { timestamps: true });

MessageSchema.index({ chatId: 1, createdAt: 1 });
// Unread counts per sender
MessageSchema.index({ receiverId: 1, read: 1 });

module.exports = mongoose.model('Message', MessageSchema);