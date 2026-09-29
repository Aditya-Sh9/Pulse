const admin = require('../config/firebase-config');
const { getActor } = require('../utils/userInfo');
const { logActivity } = require('./activityController');

// @desc    Archive the current standings as a season, then reset everyone's XP
// @route   POST /api/leaderboard/seasons
// @access  Admin
exports.closeSeason = async (req, res) => {
  const db = admin.db();
  const rawName = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  if (rawName.length > 60) return res.status(400).json({ message: 'Season name must be at most 60 characters' });

  try {
    const usersSnap = await db.collection('users').get();
    const standings = usersSnap.docs
      .map(d => ({ uid: d.id, name: d.data().name || d.data().email || 'Member', score: d.data().productivityScore || 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);

    const seasonsSnap = await db.collection('seasons').count().get();
    const number = seasonsSnap.data().count + 1;
    const actor = await getActor(req.user);

    const seasonRef = db.collection('seasons').doc();
    const writer = db.bulkWriter();
    writer.create(seasonRef, {
      number,
      name: rawName || `Season ${number}`,
      endedAt: admin.FieldValue.serverTimestamp(),
      endedBy: actor.name,
      standings
    });
    usersSnap.docs.forEach(d => writer.update(d.ref, {
      productivityScore: 0,
      xpDaily: admin.FieldValue.delete()
    }));
    await writer.close();

    await logActivity(actor, `Closed ${rawName || `Season ${number}`} and reset the leaderboard`, 'xp');
    res.status(201).json({ id: seasonRef.id, number });
  } catch (error) {
    console.error('Close season error:', error.message);
    res.status(500).json({ message: 'Failed to close the season' });
  }
};
