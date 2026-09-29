const admin = require('../config/firebase-config');
const { getActor } = require('../utils/userInfo');
const { logActivity } = require('./activityController');

// Deletes every task of a project, including each task's comments/activities subcollections
const deleteProjectTree = async (db, projectId) => {
  const tasksSnap = await db.collection('tasks').where('projectId', '==', projectId).get();
  for (const taskDoc of tasksSnap.docs) {
    await db.recursiveDelete(taskDoc.ref);
  }
  await db.collection('projects').doc(projectId).delete();
  return tasksSnap.size;
};

// @route   DELETE /api/projects/:id
// @access  Admin
exports.deleteProject = async (req, res) => {
  const { id } = req.params;
  const db = admin.db();

  try {
    const projectSnap = await db.collection('projects').doc(id).get();
    if (!projectSnap.exists) return res.status(404).json({ message: 'Project not found' });

    const removedTasks = await deleteProjectTree(db, id);
    const actor = await getActor(req.user);
    await logActivity(actor, `Deleted project "${projectSnap.data().name || 'Untitled'}" and ${removedTasks} task(s)`, 'project');

    res.status(200).json({ message: 'Project deleted', removedTasks });
  } catch (error) {
    console.error('Delete project error:', error.message);
    res.status(500).json({ message: 'Failed to delete project' });
  }
};

// @route   DELETE /api/spaces/:id
// @access  Admin
exports.deleteSpace = async (req, res) => {
  const { id } = req.params;
  const db = admin.db();

  try {
    const spaceSnap = await db.collection('spaces').doc(id).get();
    if (!spaceSnap.exists) return res.status(404).json({ message: 'Space not found' });

    const projectsSnap = await db.collection('projects').where('spaceId', '==', id).get();
    let removedTasks = 0;
    for (const projectDoc of projectsSnap.docs) {
      removedTasks += await deleteProjectTree(db, projectDoc.id);
    }
    await spaceSnap.ref.delete();

    const actor = await getActor(req.user);
    await logActivity(
      actor,
      `Deleted space "${spaceSnap.data().name || 'Untitled'}" with ${projectsSnap.size} project(s) and ${removedTasks} task(s)`,
      'space'
    );

    res.status(200).json({ message: 'Space deleted', removedProjects: projectsSnap.size, removedTasks });
  } catch (error) {
    console.error('Delete space error:', error.message);
    res.status(500).json({ message: 'Failed to delete space' });
  }
};
