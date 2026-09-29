const cron = require('node-cron');
const admin = require('../config/firebase-config');
const { sendMail, mailConfigured } = require('../config/mailer');
const { escapeHtml } = require('../utils/userInfo');
const { timezone, dateKeyInZone, addToDateKey } = require('../utils/time');
const allowedOrigins = require('../config/allowedOrigins');

// Run every night at midnight to delete read notifications older than 7 days
cron.schedule('0 0 * * *', async () => {
  try {
    const db = admin.db();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const snapshot = await db.collection('notifications')
      .where('read', '==', true)
      .where('createdAt', '<', admin.Timestamp.fromDate(sevenDaysAgo))
      .get();

    if (snapshot.empty) return;

    // BulkWriter batches internally, avoiding the 500-writes-per-batch limit
    const writer = db.bulkWriter();
    snapshot.docs.forEach((doc) => writer.delete(doc.ref));
    await writer.close();
  } catch (error) {
    console.error('Cron job error:', error.message);
  }
}, { timezone });

// Every morning, remind assignees and anyone who clicked "Remind me" about tasks due tomorrow
cron.schedule('0 8 * * *', async () => {
  try {
    const db = admin.db();
    const snapshot = await db.collection('tasks').where('dueDate', '==', addToDateKey(dateKeyInZone(), 'daily')).get();
    if (snapshot.empty) return;

    const writer = db.bulkWriter();
    snapshot.forEach((taskDoc) => {
      const task = taskDoc.data();
      if (task.status === 'COMPLETE' || task.isArchived) return;

      const recipients = new Set([task.assigneeId, ...(task.watchers || [])].filter(Boolean));
      recipients.forEach((userId) => {
        writer.create(db.collection('notifications').doc(), {
          userId,
          type: 'reminder',
          message: `"${task.title || 'A task'}" is due tomorrow`,
          taskId: taskDoc.id,
          read: false,
          createdAt: admin.FieldValue.serverTimestamp(),
          senderId: 'system',
          senderName: 'Pulse',
          senderAvatar: null
        });
      });
    });
    await writer.close();
  } catch (error) {
    console.error('Reminder cron error:', error.message);
  }
}, { timezone });

// Daily email digest of unread notifications, for users who opted in (Settings → Email digest)
const sendDigests = async () => {
  if (!mailConfigured()) return;
  const db = admin.db();
  const since = admin.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const appUrl = allowedOrigins[0];

  const users = await db.collection('users').where('emailDigest', '==', true).get();
  for (const userDoc of users.docs) {
    const user = userDoc.data();
    if (!user.email) continue;
    try {
      const unread = await db.collection('notifications')
        .where('userId', '==', userDoc.id)
        .where('read', '==', false)
        .where('createdAt', '>', since)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      if (unread.empty) continue;

      const items = unread.docs.map(n => {
        const d = n.data();
        return `<li style="margin:0 0 10px;color:#cbd5e1;"><strong style="color:#fff;">${escapeHtml(d.senderName || 'Pulse')}</strong> ${escapeHtml(d.message)}</li>`;
      }).join('');

      await sendMail({
        to: user.email,
        subject: `You have ${unread.size} unread update${unread.size === 1 ? '' : 's'} in Pulse`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#161816;color:#fff;border-radius:12px;padding:28px;border:1px solid #2D312D;">
            <h2 style="margin:0 0 16px;color:#45C1AA;">Your Pulse digest</h2>
            <ul style="padding-left:18px;margin:0 0 24px;">${items}</ul>
            <a href="${escapeHtml(appUrl)}/dashboard/inbox" style="background:#1C8575;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Open Inbox</a>
            <p style="color:#858A83;font-size:12px;margin-top:24px;">You can turn off this email in Pulse → Settings.</p>
          </div>`
      });
    } catch (error) {
      console.error(`Digest failed for ${userDoc.id}:`, error.message);
    }
  }
};

cron.schedule('0 9 * * *', () => sendDigests().catch(e => console.error('Digest cron error:', e.message)), { timezone });

module.exports = { sendDigests };
