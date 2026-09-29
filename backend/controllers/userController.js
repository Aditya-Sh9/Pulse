const admin = require('../config/firebase-config');
const { getActor } = require('../utils/userInfo');
const { logActivity } = require('./activityController');

// @route   PUT /api/users/profile
// @access  Authenticated (own profile only)
exports.updateProfile = async (req, res) => {
  const { displayName, notifications } = req.body;
  const uid = req.user.uid;
  const updates = { updatedAt: new Date().toISOString() };

  if (displayName !== undefined) {
    const name = typeof displayName === 'string' ? displayName.trim() : '';
    if (!name || name.length > 60) {
      return res.status(400).json({ message: 'Display name must be 1-60 characters' });
    }
    updates.name = name;
  }
  if (notifications !== undefined) {
    if (typeof notifications !== 'boolean') {
      return res.status(400).json({ message: 'notifications must be true or false' });
    }
    updates.notifications = notifications;
  }

  try {
    if (updates.name) {
      await admin.auth().updateUser(uid, { displayName: updates.name });
    }
    await admin.db().collection('users').doc(uid).set(updates, { merge: true });
    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error.message);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// @route   DELETE /api/users/:id
// @access  Admin
exports.removeUser = async (req, res) => {
  const { id } = req.params;
  if (id === req.user.uid) {
    return res.status(400).json({ message: 'You cannot remove your own account' });
  }

  const db = admin.db();
  try {
    const userSnap = await db.collection('users').doc(id).get();

    try {
      await admin.auth().deleteUser(id);
    } catch (err) {
      // A Firestore-only record (no Auth account) is still removable
      if (err.code !== 'auth/user-not-found') throw err;
    }

    // Unassign their open work so it doesn't point at a ghost account
    const assigned = await db.collection('tasks').where('assigneeId', '==', id).get();
    const writer = db.bulkWriter();
    assigned.forEach(taskDoc => writer.update(taskDoc.ref, { assigneeId: '' }));
    const notifs = await db.collection('notifications').where('userId', '==', id).get();
    notifs.forEach(n => writer.delete(n.ref));
    if (userSnap.exists) writer.delete(userSnap.ref);
    await writer.close();

    const actor = await getActor(req.user);
    await logActivity(actor, `Removed member "${userSnap.data()?.name || 'Unknown'}" from workspace`, 'user');

    res.status(200).json({ message: 'Member removed', unassignedTasks: assigned.size });
  } catch (error) {
    console.error('Remove user error:', error.message);
    res.status(500).json({ message: 'Failed to remove member' });
  }
};
