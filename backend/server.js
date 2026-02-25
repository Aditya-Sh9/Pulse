const express = require('express');
const cors = require('cors');
require('dotenv').config();

const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const verifyToken = require('./middleware/authMiddleware');
const isAdmin = require('./middleware/adminMiddleware');
const admin = require('./config/firebase-config');
const nodemailer = require('nodemailer');

const activityRoutes = require('./routes/activityRoutes');
const messageRoutes = require('./routes/messageRoutes');
const Message = require('./models/Message');

require('./cron/cleanup');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Update this if your frontend port is different
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

app.use('/api/activities', activityRoutes);
app.use('/api/messages', messageRoutes);

// --- SOCKET.IO LOGIC FOR REAL-TIME DIRECT MESSAGING ---
const userSockets = new Map(); // Map<userId, Set<socketId>>

// Reset all users to offline on server startup to handle unexpected crashes/restarts
const resetPresence = async () => {
  try {
    const usersSnapshot = await admin.firestore().collection('users').where('status', '==', 'online').get();
    if (usersSnapshot.empty) return;
    const batch = admin.firestore().batch();
    usersSnapshot.forEach(doc => {
      batch.update(doc.ref, { status: 'offline' });
    });
    await batch.commit();
    console.log(`🧹 Reset ${usersSnapshot.size} users to offline mode on server startup.`);
  } catch (error) {
    console.error('Error resetting presence:', error);
  }
};
resetPresence();

io.on('connection', (socket) => {
  socket.on('register', async (userId) => {
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
      // First connection across all tabs -> set user online
      try {
        await admin.firestore().collection('users').doc(userId).update({ status: 'online' });
      } catch (err) {
        console.error('Error setting user online:', err);
      }
    }
    userSockets.get(userId).add(socket.id);
  });

  socket.on('send_message', async (data) => {
    const { senderId, receiverId, text } = data;
    const chatId = [senderId, receiverId].sort().join('_');

    // Save message directly to MongoDB
    const newMessage = new Message({ senderId, receiverId, text, chatId });
    await newMessage.save();

    // Send to receiver across all their active tabs
    const receiverSocketSet = userSockets.get(receiverId);
    if (receiverSocketSet) {
      receiverSocketSet.forEach(socketId => {
        io.to(socketId).emit('receive_message', newMessage);
      });
    }

    // Echo back to sender so it shows up in their UI immediately
    socket.emit('message_sent', newMessage);
  });

  socket.on('disconnect', async () => {
    for (const [userId, socketSet] of userSockets.entries()) {
      if (socketSet.has(socket.id)) {
        socketSet.delete(socket.id);

        // If no more open tabs for this user -> set user offline
        if (socketSet.size === 0) {
          userSockets.delete(userId);
          try {
            await admin.firestore().collection('users').doc(userId).update({ status: 'offline' });
          } catch (err) {
            console.error('Error setting user offline:', err);
          }
        }
        break;
      }
    }
  });
});
// --------------------------------------------------------

// Public Route
app.get('/', (req, res) => res.send('Pulse Backend is pulsing! ⚡'));

// Protected Route Example
app.get('/api/protected-test', verifyToken, (req, res) => {
  res.status(200).json({
    message: 'Success! You have accessed a protected route.',
    user: req.user
  });
});

// Secure Invite Route
app.post('/api/invite', verifyToken, async (req, res) => {
  const { to_email, sender_name, invite_link, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const emailHTML = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1E1F21; color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #3E4045;">
        <div style="background-color: #18191B; padding: 20px; border-bottom: 1px solid #2B2D31; text-align: center;">
          <h2 style="margin: 0; color: #a855f7; letter-spacing: 1px;">⚡ PULSE WORKSPACE</h2>
        </div>
        <div style="padding: 30px;">
          <h3 style="font-size: 20px; margin-top: 0;">You've been invited!</h3>
          <p style="color: #cbd5e1; line-height: 1.6;">
            <strong>${sender_name}</strong> has invited you to collaborate on their Pulse workspace.
          </p>
          <div style="background-color: #111; border-left: 4px solid #a855f7; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-style: italic; color: #94a3b8;">"${message}"</p>
          </div>
          <div style="text-align: center; margin-top: 30px;">
            <a href="${invite_link}" style="background-color: #9333ea; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Accept Invitation</a>
          </div>
        </div>
        <div style="background-color: #111; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
          This email was sent securely via Pulse.
        </div>
      </div>
    `;

    const mailOptions = {
      from: `"Pulse Workspace" <${process.env.EMAIL_USER}>`,
      to: to_email,
      subject: `${sender_name} invited you to join Pulse`,
      html: emailHTML
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Invitation sent successfully via Nodemailer!' });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ message: 'Failed to send invitation', error: error.message });
  }
});

// Secure Admin-Only Route to Delete a Project
app.delete('/api/projects/:id', verifyToken, isAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    await admin.firestore().collection('projects').doc(id).delete();
    res.status(200).json({ message: `Project ${id} successfully deleted.` });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ message: 'Failed to delete project', error: error.message });
  }
});

// Secure Route: Get Dashboard Analytics
app.get('/api/analytics', verifyToken, async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection('tasks').get();

    let totalTasks = 0;
    let completedTasks = 0;
    let highPriority = 0;

    snapshot.forEach(doc => {
      const task = doc.data();
      totalTasks++;
      if (task.status === 'COMPLETE') {
        completedTasks++;
      } else if (task.priority === 'High') {
        highPriority++;
      }
    });

    const pendingTasks = totalTasks - completedTasks;
    const healthRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    res.status(200).json({
      totalTasks,
      completedTasks,
      pendingTasks,
      highPriority,
      healthRate
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to generate analytics', error: error.message });
  }
});

// Secure Route: Update User Profile
app.put('/api/users/profile', verifyToken, async (req, res) => {
  const { displayName, notifications } = req.body;
  const uid = req.user.uid;

  try {
    // 1. Update Firebase Auth Profile
    if (displayName) {
      await admin.auth().updateUser(uid, {
        displayName: displayName
      });
    }

    // 2. Update Firestore User Document
    const userRef = admin.firestore().collection('users').doc(uid);
    await userRef.update({
      name: displayName,
      notifications: notifications !== undefined ? notifications : true,
      updatedAt: new Date().toISOString()
    });

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
// Make sure to use server.listen instead of app.listen for Socket.io to work!
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));