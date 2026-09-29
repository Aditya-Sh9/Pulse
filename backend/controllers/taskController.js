const admin = require('../config/firebase-config');
const { getActor } = require('../utils/userInfo');
const { dateKeyInZone, addToDateKey } = require('../utils/time');
const { logActivity } = require('./activityController');

const STATUSES = ['TO DO', 'IN PROGRESS', 'COMPLETE'];
const RECURRENCES = ['daily', 'weekly', 'monthly'];
const XP_PER_TASK = 10;
// Task XP a single user can earn per day; stops farming with throwaway self-assigned tasks
const DAILY_TASK_XP_CAP = Number(process.env.DAILY_TASK_XP_CAP) || 100;

class TaskStatusError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// Fields copied onto the next occurrence of a recurring task
const RECURRING_FIELDS = ['title', 'description', 'priority', 'assigneeId', 'projectId', 'labels', 'recurrence', 'createdBy', 'watchers'];

// @desc    Change a task's status. XP is awarded/revoked here, atomically,
//          so clients can never write productivityScore or completedBy themselves.
//          Also enforces dependencies and spawns the next occurrence of recurring tasks.
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
  const today = dateKeyInZone();

  try {
    const result = await db.runTransaction(async (tx) => {
      const taskSnap = await tx.get(taskRef);
      if (!taskSnap.exists) throw new TaskStatusError(404, 'Task not found');

      const task = taskSnap.data();
      const previous = task.status;
      if (previous === status) return { unchanged: true, task };

      const completing = status === 'COMPLETE' && previous !== 'COMPLETE';
      const reopening = previous === 'COMPLETE' && status !== 'COMPLETE';

      // --- reads (Firestore transactions require all reads before writes) ---
      if (completing && Array.isArray(task.blockedBy) && task.blockedBy.length > 0) {
        const blockerSnaps = await tx.getAll(...task.blockedBy.slice(0, 20).map(bid => db.collection('tasks').doc(bid)));
        const open = blockerSnaps.filter(s => s.exists && s.data().status !== 'COMPLETE');
        if (open.length > 0) {
          throw new TaskStatusError(409, `Blocked by ${open.length} unfinished task(s)`, {
            blockedBy: open.map(s => ({ id: s.id, title: s.data().title }))
          });
        }
      }

      // XP goes to the assignee (or whoever closed an unassigned task)
      const xpUserId = completing ? (task.assigneeId || req.user.uid) : (reopening ? task.completedBy : null);
      const xpUserSnap = xpUserId ? await tx.get(db.collection('users').doc(xpUserId)) : null;

      // --- writes ---
      const updates = { status };
      let xpDelta = 0;

      if (completing) {
        const daily = xpUserSnap?.data()?.xpDaily;
        const earnedToday = daily?.date === today ? daily.amount : 0;
        const award = xpUserSnap?.exists ? Math.max(0, Math.min(XP_PER_TASK, DAILY_TASK_XP_CAP - earnedToday)) : 0;
        xpDelta = award;
        updates.completedBy = xpUserId;
        updates.completedAt = FieldValue.serverTimestamp();
        updates.xpAwarded = award;
        if (xpUserSnap?.exists) {
          tx.update(xpUserSnap.ref, {
            productivityScore: FieldValue.increment(award),
            xpDaily: { date: today, amount: earnedToday + award }
          });
        }

        // Recurring: spawn the next occurrence once per completion cycle
        if (RECURRENCES.includes(task.recurrence) && !task.recurrenceSpawned) {
          const nextRef = db.collection('tasks').doc();
          const next = {};
          RECURRING_FIELDS.forEach(k => { if (task[k] !== undefined) next[k] = task[k]; });
          Object.assign(next, {
            status: 'TO DO',
            dueDate: addToDateKey(task.dueDate || today, task.recurrence),
            subtasks: (task.subtasks || []).map(s => ({ ...s, completed: false })),
            comments: 0,
            order: task.order ?? null,
            recurrenceOf: task.recurrenceOf || id,
            createdAt: FieldValue.serverTimestamp()
          });
          tx.set(nextRef, next);
          updates.recurrenceSpawned = nextRef.id;
        }
      }

      if (reopening) {
        // Legacy completions (before xpAwarded existed) were worth a flat 10
        const revoke = task.completedBy ? (task.xpAwarded ?? XP_PER_TASK) : 0;
        xpDelta = -revoke;
        updates.completedBy = FieldValue.delete();
        updates.completedAt = FieldValue.delete();
        updates.xpAwarded = FieldValue.delete();
        if (xpUserSnap?.exists && revoke > 0) {
          const daily = xpUserSnap.data().xpDaily;
          const xpUpdate = { productivityScore: FieldValue.increment(-revoke) };
          // Give back today's cap headroom so re-completing isn't penalised
          if (daily?.date === today) xpUpdate.xpDaily = { date: today, amount: Math.max(0, daily.amount - revoke) };
          tx.update(xpUserSnap.ref, xpUpdate);
        }
      }

      tx.update(taskRef, updates);
      return { task, previous, xpDelta, spawned: updates.recurrenceSpawned };
    });

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

    res.status(200).json({
      status,
      previous: result.previous,
      xpDelta: result.xpDelta,
      nextOccurrenceId: typeof result.spawned === 'string' ? result.spawned : undefined
    });
  } catch (error) {
    if (error instanceof TaskStatusError) {
      return res.status(error.status).json({ message: error.message, ...error.extra });
    }
    console.error('Task status update error:', error.message);
    res.status(500).json({ message: 'Failed to update task status' });
  }
};
