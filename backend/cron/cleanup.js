const cron = require('node-cron');
const admin = require('../config/firebase-config');

// Due dates are stored as local calendar days (YYYY-MM-DD), so jobs run in the workspace's timezone
const timezone = process.env.APP_TIMEZONE || 'Asia/Kolkata';

const dateKeyInZone = (date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

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
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const snapshot = await db.collection('tasks').where('dueDate', '==', dateKeyInZone(tomorrow)).get();
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
