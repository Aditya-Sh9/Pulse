const Message = require('../models/Message');
const { getIO } = require('../socket/chat');

const PAGE_SIZE = 50;
const isValidId = (id) => typeof id === 'string' && id.length > 0 && id.length <= 128;

// Only ever returns conversations the authenticated user is part of.
// Paginated newest-first; `before` (ISO date) loads older pages.
exports.getChatHistory = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    if (!isValidId(otherUserId)) return res.status(400).json({ message: 'Invalid user' });

    const filter = { chatId: [req.user.uid, otherUserId].sort().join('_') };
    if (req.query.before) {
      const before = new Date(req.query.before);
      if (Number.isNaN(before.getTime())) return res.status(400).json({ message: 'Invalid cursor' });
      filter.createdAt = { $lt: before };
    }

    const page = await Message.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE + 1);
    const hasMore = page.length > PAGE_SIZE;
    // Returned oldest-first for rendering
    res.status(200).json({ messages: page.slice(0, PAGE_SIZE).reverse(), hasMore });
  } catch (error) {
    console.error('Error fetching chat history:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// { [senderId]: unreadCount } for the signed-in user
exports.getUnreadCounts = async (req, res) => {
  try {
    const rows = await Message.aggregate([
      { $match: { receiverId: req.user.uid, read: false } },
      { $group: { _id: '$senderId', count: { $sum: 1 } } }
    ]);
    res.status(200).json(Object.fromEntries(rows.map(r => [r._id, r.count])));
  } catch (error) {
    console.error('Error counting unread messages:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    if (!isValidId(otherUserId)) return res.status(400).json({ message: 'Invalid user' });

    const chatId = [req.user.uid, otherUserId].sort().join('_');
    const readAt = new Date();
    const result = await Message.updateMany(
      { chatId, senderId: otherUserId, read: false },
      { $set: { read: true, readAt } }
    );

    // Read receipt: tell the sender's open tabs their messages were seen
    if (result.modifiedCount > 0) {
      getIO()?.to(`user:${otherUserId}`).emit('messages_read', { chatId, by: req.user.uid, readAt });
    }
    res.status(200).json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    console.error('Error marking messages read:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};
