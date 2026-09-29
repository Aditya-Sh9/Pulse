const Message = require('../models/Message');

const isValidId = (id) => typeof id === 'string' && id.length > 0 && id.length <= 128;

// Only ever returns conversations the authenticated user is part of
exports.getChatHistory = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    if (!isValidId(otherUserId)) return res.status(400).json({ message: 'Invalid user' });

    const chatId = [req.user.uid, otherUserId].sort().join('_');
    // Latest 200 messages, returned oldest-first for rendering
    const messages = await Message.find({ chatId }).sort({ createdAt: -1 }).limit(200);
    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error('Error fetching chat history:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    if (!isValidId(otherUserId)) return res.status(400).json({ message: 'Invalid user' });

    const chatId = [req.user.uid, otherUserId].sort().join('_');
    await Message.updateMany(
      { chatId, senderId: otherUserId, read: false },
      { $set: { read: true } }
    );
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking messages read:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
