// Where clicking a notification should take the user.
// Note: for message/support notifications `taskId` holds the sender's uid.
export const openNotification = (notif, { navigate, tasks, openTaskDrawer, showToast }) => {
  if (notif.type === 'message' || notif.type === 'support') {
    navigate(`/dashboard/messages/${notif.taskId}`)
    return
  }
  if (notif.taskId === 'leaderboard') {
    navigate('/dashboard/leaderboard')
    return
  }
  const task = tasks.find(t => t.id === notif.taskId)
  if (task) openTaskDrawer(task)
  else showToast?.('That task no longer exists', 'info')
}
