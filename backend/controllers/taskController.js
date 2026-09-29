const admin = require('../config/firebase-config');
const { getActor } = require('../utils/userInfo');
const { logActivity } = require('./activityController');

const STATUSES = ['TO DO', 'IN PROGRESS', 'COMPLETE'];
const XP_PER_TASK = 10;

// @desc    Change a task's status. XP is awarded/revoked here, atomically,
//          so clients can never write productivityScore or completedBy themselves.
// @route   PATCH /api/tasks/:id/status
// @access  Authenticated
exports.updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!STATUSES.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const db = admin.db();
  const { FieldValue } = admin;
  const taskRef = db.collection('tasks').doc(id);

  try {
    const result = await db.runTransaction(async (tx) => {
      const taskSnap = await tx.get(taskRef);
      if (!taskSnap.exists) return { notFound: true };

      const task = taskSnap.data();
      const previous = task.status;
      if (previous === status) return { unchanged: true, task };

      const updates = { status };
      const completing = status === 'COMPLETE' && previous !== 'COMPLETE';
      const reopening = previous === 'COMPLETE' && status !== 'COMPLETE';

      // XP goes to the assignee (or whoever closed an unassigned task)
      const awardeeId = completing ? (task.assigneeId || req.user.uid) : null;
      const revokeFromId = reopening ? task.completedBy : null;
      const xpUserId = awardeeId || revokeFromId;

      // Firestore transactions require all reads before any writes
      const xpUserSnap = xpUserId ? await tx.get(db.collection('users').doc(xpUserId)) : null;

      if (completing) {
        updates.completedBy = awardeeId;
        updates.completedAt = FieldValue.serverTimestamp();
      }
      if (reopening) {
        updates.completedBy = FieldValue.delete();
        updates.completedAt = FieldValue.delete();
      }

      tx.update(taskRef, updates);

      if (xpUserSnap?.exists) {
        tx.update(xpUserSnap.ref, {
          productivityScore: FieldValue.increment(completing ? XP_PER_TASK : -XP_PER_TASK)
        });
      }

      return { task, previous };
    });

    if (result.notFound) return res.status(404).json({ message: 'Task not found' });
    if (result.unchanged) return res.status(200).json({ status });

    const actor = await getActor(req.user);
    const title = result.task.title || 'Untitled task';

    await taskRef.collection('activities').add({
      action: `moved task to ${status}`,
      userId: actor.uid,
      userName: actor.name,
      userAvatar: actor.avatar,
      createdAt: FieldValue.serverTimestamp()
    });
    await logActivity(actor, `Moved task "${title}" to ${status}`, 'task', { taskId: id });

    res.status(200).json({ status, previous: result.previous });
  } catch (error) {
    console.error('Task status update error:', error.message);
    res.status(500).json({ message: 'Failed to update task status' });
  }
};
