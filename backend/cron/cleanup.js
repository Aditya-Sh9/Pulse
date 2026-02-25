const cron = require('node-cron');
const admin = require('../config/firebase-config');

// 👉 UPDATED CODE STARTS HERE
// Run every night at midnight to delete read notifications older than 7 days
cron.schedule('0 0 * * *', async () => {
  try {
    const db = admin.firestore();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const snapshot = await db.collection('notifications')
      .where('read', '==', true)
      .where('createdAt', '<', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
      .get();

    if (snapshot.empty) {
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error('Cron job error:', error);
  }
});
// 👉 UPDATED CODE ENDS HERE