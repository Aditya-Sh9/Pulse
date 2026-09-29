export const projectUrl = (projectId, view = 'list') =>
  `${window.location.origin}/dashboard/${view}/${projectId}`

// Opens the task drawer on arrival (handled by TaskDeepLink in Dashboard)
export const taskUrl = (task) =>
  `${projectUrl(task.projectId)}?task=${encodeURIComponent(task.id)}`

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
