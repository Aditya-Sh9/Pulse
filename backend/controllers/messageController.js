const Message = require('../models/Message');

exports.getChatHistory = async (req, res) => {
  try {
    const { userId, otherUserId } = req.params;
    const chatId = [userId, otherUserId].sort().join('_');
    
    const messages = await Message.find({ chatId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { userId, otherUserId } = req.body;
    const chatId = [userId, otherUserId].sort().join('_');
    
    await Message.updateMany(
      { chatId, senderId: otherUserId, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};