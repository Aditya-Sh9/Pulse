const { Server } = require('socket.io');
const admin = require('../config/firebase-config');
const allowedOrigins = require('../config/allowedOrigins');
const Message = require('../models/Message');

const MAX_MESSAGE_LENGTH = 2000;
const RATE_WINDOW_MS = 10 * 1000;
const RATE_MAX_MESSAGES = 20;

// The REST layer emits read receipts through the same server
let ioInstance = null;
const getIO = () => ioInstance;

const setPresence = async (uid, status) => {
  try {
    await admin.db().collection('users').doc(uid).update({ status });
  } catch (err) {
    console.error(`Error setting user ${status}:`, err.message);
  }
};

// Reset all users to offline on server startup to handle unexpected crashes/restarts
const resetPresence = async () => {
  try {
    const usersSnapshot = await admin.db().collection('users').where('status', '==', 'online').get();
    if (usersSnapshot.empty) return;
    const batch = admin.db().batch();
    usersSnapshot.forEach(doc => batch.update(doc.ref, { status: 'offline' }));
    await batch.commit();
    console.log(`🧹 Reset ${usersSnapshot.size} users to offline mode on server startup.`);
  } catch (error) {
    console.error('Error resetting presence:', error.message);
  }
};

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
    maxHttpBufferSize: 16 * 1024,
  });
  ioInstance = io;

  resetPresence();

  // Open tab count per user, so presence only flips when the last tab closes
  const openTabs = new Map();

  // Every socket must present a valid Firebase ID token; the uid comes from the token, never the client
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      socket.data.uid = decoded.uid;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const uid = socket.data.uid;
    socket.join(`user:${uid}`);

    const tabs = (openTabs.get(uid) || 0) + 1;
    openTabs.set(uid, tabs);
    if (tabs === 1) setPresence(uid, 'online');

    let windowStart = Date.now();
    let sentInWindow = 0;

    socket.on('send_message', async (data, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const receiverId = typeof data?.receiverId === 'string' ? data.receiverId.trim() : '';
      const text = typeof data?.text === 'string' ? data.text.trim() : '';

      if (!receiverId || receiverId.length > 128 || receiverId === uid) {
        return reply({ ok: false, error: 'Invalid recipient' });
      }
      if (!text || text.length > MAX_MESSAGE_LENGTH) {
        return reply({ ok: false, error: `Messages must be 1-${MAX_MESSAGE_LENGTH} characters` });
      }

      const now = Date.now();
      if (now - windowStart > RATE_WINDOW_MS) {
        windowStart = now;
        sentInWindow = 0;
      }
      if (++sentInWindow > RATE_MAX_MESSAGES) {
        return reply({ ok: false, error: 'You are sending messages too quickly' });
      }

      try {
        const chatId = [uid, receiverId].sort().join('_');
        const newMessage = await Message.create({ senderId: uid, receiverId, text, chatId });

        // Deliver to every open tab of the receiver, and echo to all of the sender's tabs
        io.to(`user:${receiverId}`).emit('receive_message', newMessage);
        io.to(`user:${uid}`).emit('message_sent', newMessage);
        reply({ ok: true });
      } catch (err) {
        console.error('Error saving message:', err.message);
        reply({ ok: false, error: 'Message could not be delivered' });
      }
    });

    // Typing indicator: relayed to the other participant only, never stored
    let lastTyping = 0;
    socket.on('typing', (data) => {
      const receiverId = typeof data?.receiverId === 'string' ? data.receiverId : '';
      if (!receiverId || receiverId.length > 128 || receiverId === uid) return;
      const now = Date.now();
      if (data.isTyping && now - lastTyping < 1000) return;
      lastTyping = now;
      io.to(`user:${receiverId}`).emit('typing', { from: uid, isTyping: Boolean(data.isTyping) });
    });

    socket.on('disconnect', () => {
      const remaining = (openTabs.get(uid) || 1) - 1;
      if (remaining <= 0) {
        openTabs.delete(uid);
        setPresence(uid, 'offline');
      } else {
        openTabs.set(uid, remaining);
      }
    });
  });

  return io;
}

module.exports = initSocket;
module.exports.getIO = getIO;
