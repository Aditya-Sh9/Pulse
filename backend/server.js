const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
require('dotenv').config();

const mongoose = require('mongoose');
const http = require('http');

const allowedOrigins = require('./config/allowedOrigins');
const initSocket = require('./socket/chat');

const activityRoutes = require('./routes/activityRoutes');
const messageRoutes = require('./routes/messageRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const spaceRoutes = require('./routes/spaceRoutes');
const inviteRoutes = require('./routes/inviteRoutes');

require('./cron/cleanup');

const app = express();
const server = http.createServer(app);

// Render / most PaaS hosts sit behind one proxy hop; needed for correct client IPs in rate limiting.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '50kb' }));

// Coarse per-IP ceiling for the whole API; sensitive routes add their own tighter limits.
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
}));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Atlas Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));

app.get('/', (req, res) => res.send('Pulse Backend is pulsing! ⚡'));

app.use('/api/activities', activityRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/spaces', spaceRoutes);
app.use('/api/invite', inviteRoutes);

app.use((req, res) => res.status(404).json({ message: 'Not found' }));

// Never leak stack traces or internal error text to clients
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

initSocket(server);

const PORT = process.env.PORT || 5000;
// Make sure to use server.listen instead of app.listen for Socket.io to work!
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
