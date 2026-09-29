import React, { createContext, useState, useCallback, useEffect, useContext, useMemo, useRef } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  where,
  limit,
  getDocs,
  writeBatch
} from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from './AuthContext'
import confetti from 'canvas-confetti'
import { AlertCircle, CheckCircle2, X, AlertTriangle, Info } from 'lucide-react'
import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const COLLAPSED_SPACES_KEY = 'pulse:collapsedSpaces'

// Fields a client is allowed to set when creating or duplicating a task
const TASK_FIELDS = ['title', 'description', 'priority', 'assigneeId', 'dueDate', 'status', 'projectId']

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

const readCollapsedSpaces = () => {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_SPACES_KEY)) || []
  } catch {
    return []
  }
}

export const ProjectContext = createContext()

export const ProjectProvider = ({ children }) => {
  const { currentUser, userRole, getAuthToken } = useAuth()

  const [tasks, setTasks] = useState([])
  const [rawProjects, setRawProjects] = useState([])
  const [members, setMembers] = useState([])
  const [notifications, setNotifications] = useState([])
  const [globalActivities, setGlobalActivities] = useState([])
  const [xpActivities, setXpActivities] = useState([])
  // The socket is plumbing, not UI state, so it lives in a ref
  const socketRef = useRef(null)
  const [realtimeMessages, setRealtimeMessages] = useState([])
  const [rawSpaces, setRawSpaces] = useState([])
  const [collapsedSpaces, setCollapsedSpaces] = useState(readCollapsedSpaces)

  const [activeTaskId, setActiveTaskId] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Status changes go through the API; keep them applied locally until the snapshot catches up
  const [pendingStatus, setPendingStatus] = useState({})

  // --- GLOBAL TOAST SYSTEM ---
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((msg, type = 'error') => {
    clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // --- GLOBAL CONFIRM DIALOG SYSTEM ---
  const [confirmConfig, setConfirmConfig] = useState(null)

  const confirmAction = useCallback((title, message, onConfirm, type = 'danger') => {
    setConfirmConfig({ title, message, onConfirm, type })
  }, [])

  useEffect(() => {
    if (!confirmConfig) return
    const onKey = (e) => { if (e.key === 'Escape') setConfirmConfig(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [confirmConfig])

  const myProfile = useMemo(() => members.find(m => m.id === currentUser?.uid), [members, currentUser?.uid])

  // Per-user view state: favorites live on the user's own doc, collapsed spaces in this browser
  const projects = useMemo(() => {
    const favorites = myProfile?.favoriteProjects || []
    return rawProjects.map(p => ({ ...p, isFavorite: favorites.includes(p.id) }))
  }, [rawProjects, myProfile?.favoriteProjects])

  const spaces = useMemo(
    () => rawSpaces.map(s => ({ ...s, isExpanded: !collapsedSpaces.includes(s.id) })),
    [rawSpaces, collapsedSpaces]
  )

  const visibleTasks = useMemo(() => {
    if (Object.keys(pendingStatus).length === 0) return tasks
    return tasks.map(t => (pendingStatus[t.id] ? { ...t, status: pendingStatus[t.id] } : t))
  }, [tasks, pendingStatus])

  const activeTask = useMemo(
    () => (activeTaskId ? visibleTasks.find(t => t.id === activeTaskId) || null : null),
    [activeTaskId, visibleTasks]
  )

  // --- REAL-TIME SOCKET (authenticated with the Firebase ID token) ---
  useEffect(() => {
    if (!currentUser) return
    const newSocket = io(API_URL, {
      // Callback form fetches a fresh token on every (re)connect, so expiry never strands the socket
      auth: (cb) => { getAuthToken().then(token => cb({ token })).catch(() => cb({})) }
    })
    socketRef.current = newSocket

    newSocket.on('connect_error', (err) => console.error('Socket connection failed:', err.message))

    newSocket.on('receive_message', (message) => {
      setRealtimeMessages(prev => [...prev, message])
      // Don't toast about a conversation that's already on screen
      if (window.location.pathname !== `/dashboard/messages/${message.senderId}`) {
        showToast('New message received', 'success')
      }
    })

    newSocket.on('message_sent', (message) => {
      setRealtimeMessages(prev => (prev.some(m => m._id === message._id) ? prev : [...prev, message]))
    })

    return () => {
      newSocket.disconnect()
      socketRef.current = null
    }
  }, [currentUser, getAuthToken, showToast])

  const apiFetch = useCallback(async (endpoint, options = {}) => {
    const token = await getAuthToken()
    if (!token) throw new Error('You are signed out. Please log in again.')

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    const data = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(data?.message || `Request failed (${response.status})`)
    }
    return data
  }, [getAuthToken])

  const logGlobalActivity = useCallback(async (actionText, type = 'system', metadata = {}) => {
    if (!currentUser) return
    try {
      const savedLog = await apiFetch('/api/activities', {
        method: 'POST',
        body: JSON.stringify({ action: clip(actionText, 500), type, metadata })
      })
      setGlobalActivities(prev => [savedLog, ...prev].slice(0, 150))
      if (type === 'xp') setXpActivities(prev => [savedLog, ...prev].slice(0, 20))
    } catch (error) {
      console.error('Activity log error:', error)
    }
  }, [currentUser, apiFetch])

  // The full audit log is admin-only; everyone gets the XP ticker
  useEffect(() => {
    if (!currentUser || !userRole) return
    let cancelled = false
    apiFetch('/api/activities/xp')
      .then(logs => { if (!cancelled) setXpActivities(logs) })
      .catch(error => console.error('Failed to fetch XP activity:', error))
    if (userRole === 'admin') {
      apiFetch('/api/activities')
        .then(logs => { if (!cancelled) setGlobalActivities(logs) })
        .catch(error => console.error('Failed to fetch activity log:', error))
    }
    return () => { cancelled = true }
  }, [currentUser, userRole, apiFetch])

  // Fetch Users
  useEffect(() => {
    if (!currentUser) return
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setMembers(snapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
          id: docSnap.id,
          ...data,
          avatar: data.name
            ? data.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            : '??',
          status: data.status || 'offline',
          productivityScore: data.productivityScore || 0
        }
      }))
    })
    return () => unsubscribe()
  }, [currentUser])

  // Fetch Spaces from Firestore
  useEffect(() => {
    if (!currentUser) return
    const q = query(collection(db, 'spaces'), orderBy('createdAt', 'asc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRawSpaces(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsubscribe()
  }, [currentUser])

  // Fetch Projects
  useEffect(() => {
    if (!currentUser) return
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'asc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRawProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsubscribe()
  }, [currentUser])

  // Fetch Tasks
  useEffect(() => {
    if (!currentUser) return
    const unsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const freshTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setTasks(freshTasks)
      // Drop optimistic statuses the server has confirmed
      setPendingStatus(prev => {
        const next = { ...prev }
        let changed = false
        for (const [id, status] of Object.entries(prev)) {
          const t = freshTasks.find(x => x.id === id)
          if (!t || t.status === status) { delete next[id]; changed = true }
        }
        return changed ? next : prev
      })
    })
    return () => unsubscribe()
  }, [currentUser])

  // Fetch Notifications
  useEffect(() => {
    if (!currentUser) return
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsubscribe()
  }, [currentUser])

  const actorName = currentUser?.displayName || myProfile?.name || currentUser?.email || 'User'

  const logTaskActivity = useCallback(async (taskId, action) => {
    if (!currentUser) return
    try {
      await addDoc(collection(db, 'tasks', taskId, 'activities'), {
        action,
        userId: currentUser.uid,
        userName: actorName,
        userAvatar: actorName[0].toUpperCase(),
        createdAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }, [currentUser, actorName])

  const triggerNotification = useCallback(async (toUserId, type, message, referenceId) => {
    if (!currentUser || !toUserId || toUserId === currentUser.uid) return
    // Respect the recipient's "Push Notifications" preference for task alerts
    const recipient = members.find(m => m.id === toUserId)
    if (recipient?.notifications === false && ['assigned', 'mention'].includes(type)) return
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: toUserId,
        type,
        message: clip(message, 500),
        taskId: referenceId,
        read: false,
        createdAt: serverTimestamp(),
        senderId: currentUser.uid,
        senderName: actorName,
        senderAvatar: currentUser.photoURL || null
      })
    } catch (error) {
      console.error('Failed to send notification:', error)
    }
  }, [currentUser, members, actorName])

  // The active task is cleared shortly after closing (exit animation). Reopening within that
  // window must cancel the pending clear, or it would blank the drawer that was just opened.
  const drawerClearTimer = useRef(null)

  const openTaskDrawer = useCallback((task) => {
    clearTimeout(drawerClearTimer.current)
    setActiveTaskId(task.id)
    setIsDrawerOpen(true)
  }, [])

  const closeTaskDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    clearTimeout(drawerClearTimer.current)
    drawerClearTimer.current = setTimeout(() => setActiveTaskId(null), 300)
  }, [])

  useEffect(() => () => clearTimeout(drawerClearTimer.current), [])

  const addTask = useCallback(async (taskData) => {
    try {
      const newTask = {}
      TASK_FIELDS.forEach(key => { if (taskData[key] !== undefined) newTask[key] = taskData[key] })
      Object.assign(newTask, {
        title: String(newTask.title || '').trim().slice(0, 300),
        status: newTask.status || 'TO DO',
        priority: newTask.priority || 'Normal',
        assigneeId: newTask.assigneeId || '',
        dueDate: newTask.dueDate || '',
        description: newTask.description || '',
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        comments: 0,
        subtasks: taskData.subtasks || []
      })
      const docRef = await addDoc(collection(db, 'tasks'), newTask)
      await logTaskActivity(docRef.id, 'created this task')
      await logGlobalActivity(`Created task: "${newTask.title}"`, 'task')

      if (newTask.assigneeId) {
        await triggerNotification(newTask.assigneeId, 'assigned', `assigned you to "${clip(newTask.title, 200)}"`, docRef.id)
      }
      showToast('Task created successfully', 'success')
      return { id: docRef.id, ...newTask }
    } catch (error) {
      console.error('Error adding task: ', error)
      showToast('Failed to create task', 'error')
    }
  }, [currentUser, triggerNotification, logTaskActivity, logGlobalActivity, showToast])

  // Status is server-authoritative (it drives XP), so it is the one field not written directly
  const setTaskStatus = useCallback(async (taskId, status) => {
    const oldTask = tasks.find(t => t.id === taskId)
    if (!oldTask || oldTask.status === status) return

    setPendingStatus(prev => ({ ...prev, [taskId]: status }))
    try {
      await apiFetch(`/api/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      if (status === 'COMPLETE') {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#45C1AA', '#F57D43', '#10B981'], zIndex: 9999 })
      }
    } catch (error) {
      setPendingStatus(prev => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
      showToast(error.message || 'Failed to update status', 'error')
    }
  }, [tasks, apiFetch, showToast])

  const updateTask = useCallback(async (taskId, updates) => {
    const { status, ...fields } = updates
    if (status !== undefined) await setTaskStatus(taskId, status)
    if (Object.keys(fields).length === 0) return

    try {
      const oldTask = tasks.find(t => t.id === taskId)
      const taskName = oldTask?.title || 'Unknown Task'

      await updateDoc(doc(db, 'tasks', taskId), fields)

      if (!oldTask) return
      if (fields.priority && fields.priority !== oldTask.priority) {
        await logTaskActivity(taskId, `set priority to ${fields.priority}`)
        await logGlobalActivity(`Changed priority of "${taskName}" to ${fields.priority}`, 'task')
      }
      if (fields.title && fields.title !== oldTask.title) {
        await logTaskActivity(taskId, `renamed this task to "${fields.title}"`)
        await logGlobalActivity(`Renamed task "${oldTask.title}" to "${fields.title}"`, 'task')
      }
      if (fields.description !== undefined && fields.description !== (oldTask.description || '')) {
        await logGlobalActivity(`Updated description for task "${taskName}"`, 'task')
      }
      if (fields.dueDate !== undefined && fields.dueDate !== oldTask.dueDate) {
        await logTaskActivity(taskId, fields.dueDate ? `set the due date to ${fields.dueDate}` : 'removed the due date')
        await logGlobalActivity(`Changed due date for "${taskName}"`, 'task')
      }
      if (fields.isArchived !== undefined && fields.isArchived !== !!oldTask.isArchived) {
        await logTaskActivity(taskId, fields.isArchived ? 'archived this task' : 'unarchived this task')
        await logGlobalActivity(fields.isArchived ? `Archived task "${taskName}"` : `Unarchived task "${taskName}"`, 'task')
      }
      if (fields.assigneeId !== undefined && fields.assigneeId !== oldTask.assigneeId) {
        if (fields.assigneeId === '') {
          await logTaskActivity(taskId, 'removed the assignee')
          await logGlobalActivity(`Removed assignee from "${taskName}"`, 'task')
        } else {
          const member = members.find(m => m.id === fields.assigneeId)
          await triggerNotification(fields.assigneeId, 'assigned', `assigned you to "${clip(taskName, 200)}"`, taskId)
          await logTaskActivity(taskId, `assigned this to ${member?.name || 'a teammate'}`)
          await logGlobalActivity(`Assigned "${taskName}" to ${member?.name || 'a teammate'}`, 'task')
        }
      }
    } catch (error) {
      console.error('Error updating task: ', error)
      showToast(error.code === 'permission-denied' ? 'You don’t have permission to make that change' : 'Failed to update task', 'error')
    }
  }, [tasks, setTaskStatus, triggerNotification, members, logTaskActivity, logGlobalActivity, showToast])

  const deleteTask = useCallback(async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      await deleteDoc(doc(db, 'tasks', taskId))
      if (activeTaskId === taskId) closeTaskDrawer()
      await logGlobalActivity(`Deleted task "${task?.title || 'Unknown'}"`, 'task')
      showToast('Task deleted', 'success')
    } catch (error) {
      console.error('Error deleting task: ', error)
      showToast(error.code === 'permission-denied' ? 'Only admins can delete tasks' : 'Failed to delete task', 'error')
    }
  }, [activeTaskId, tasks, closeTaskDrawer, logGlobalActivity, showToast])

  const duplicateTask = useCallback((task) => addTask({
    ...task,
    title: `${task.title} (Copy)`,
    subtasks: (task.subtasks || []).map((s, i) => ({ ...s, id: Date.now() + i, completed: false }))
  }), [addTask])

  // "Remind me": the nightly job notifies watchers the day before a task is due
  const toggleTaskWatch = useCallback(async (task) => {
    if (!currentUser) return
    const watching = (task.watchers || []).includes(currentUser.uid)
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        watchers: watching ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
      })
      if (watching) showToast('Reminder removed', 'info')
      else showToast(task.dueDate ? 'You’ll be reminded the day before it’s due' : 'Reminder set. Add a due date so we know when to remind you.', 'success')
    } catch (error) {
      console.error('Error toggling reminder:', error)
      showToast('Failed to update reminder', 'error')
    }
  }, [currentUser, showToast])

  const addSubtask = useCallback(async (taskId, title) => {
    try {
      const newSubtask = { id: Date.now(), title, completed: false }
      await updateDoc(doc(db, 'tasks', taskId), { subtasks: arrayUnion(newSubtask) })
      await logGlobalActivity(`Added subtask "${title}"`, 'task')
    } catch { showToast('Failed to add subtask', 'error') }
  }, [logGlobalActivity, showToast])

  const toggleSubtask = useCallback(async (taskId, subtaskId, currentSubtasks) => {
    try {
      const subtask = currentSubtasks.find(s => s.id === subtaskId)
      const updatedSubtasks = currentSubtasks.map(s =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      )
      await updateDoc(doc(db, 'tasks', taskId), { subtasks: updatedSubtasks })
      await logGlobalActivity(`${!subtask.completed ? 'Completed' : 'Unchecked'} subtask "${subtask.title}"`, 'task')
    } catch { showToast('Failed to update subtask', 'error') }
  }, [logGlobalActivity, showToast])

  const editSubtask = useCallback(async (taskId, subtaskId, newTitle, currentSubtasks) => {
    try {
      const updatedSubtasks = currentSubtasks.map(s =>
        s.id === subtaskId ? { ...s, title: newTitle } : s
      )
      await updateDoc(doc(db, 'tasks', taskId), { subtasks: updatedSubtasks })
      await logGlobalActivity(`Edited a subtask to "${newTitle}"`, 'task')
    } catch { showToast('Failed to edit subtask', 'error') }
  }, [logGlobalActivity, showToast])

  const deleteSubtask = useCallback(async (taskId, subtaskId, currentSubtasks) => {
    try {
      const subtask = currentSubtasks.find(s => s.id === subtaskId)
      const updatedSubtasks = currentSubtasks.filter(s => s.id !== subtaskId)
      await updateDoc(doc(db, 'tasks', taskId), { subtasks: updatedSubtasks })
      await logGlobalActivity(`Deleted subtask "${subtask?.title || ''}"`, 'task')
      showToast('Subtask deleted', 'success')
    } catch { showToast('Failed to delete subtask', 'error') }
  }, [logGlobalActivity, showToast])

  const addComment = useCallback(async (taskId, text) => {
    try {
      await addDoc(collection(db, 'tasks', taskId, 'comments'), {
        text: clip(text, 2000),
        userId: currentUser.uid,
        userName: actorName,
        userAvatar: actorName[0].toUpperCase(),
        createdAt: serverTimestamp()
      })
      await updateDoc(doc(db, 'tasks', taskId), { comments: increment(1) })
      await logGlobalActivity('Commented on a task', 'user')

      // @mentions match a member's first name or full name without spaces (e.g. @riya, @riyakapoor)
      const mentioned = new Set()
      for (const [, handle] of text.matchAll(/@([\p{L}\p{N}._-]{2,})/gu)) {
        const needle = handle.toLowerCase()
        const member = members.find(m => {
          const name = (m.name || '').toLowerCase()
          return name.split(' ')[0] === needle || name.replace(/\s+/g, '') === needle
        })
        if (member) mentioned.add(member.id)
      }
      mentioned.forEach(id => triggerNotification(id, 'mention', 'mentioned you in a comment', taskId))
    } catch (error) {
      console.error('Error adding comment: ', error)
      showToast('Failed to add comment', 'error')
    }
  }, [members, currentUser, actorName, triggerNotification, logGlobalActivity, showToast])

  const sendMessage = useCallback((receiverId, text) => {
    const socket = socketRef.current
    if (!currentUser || !receiverId || !text.trim() || !socket) return
    if (!socket.connected) {
      showToast('Reconnecting to chat… try again in a moment', 'info')
      return
    }
    socket.emit('send_message', { receiverId, text }, (response) => {
      if (!response?.ok) {
        showToast(response?.error || 'Message could not be sent', 'error')
        return
      }
      triggerNotification(receiverId, 'message', 'sent you a message', currentUser.uid)
    })
  }, [currentUser, triggerNotification, showToast])

  const markChatAsRead = useCallback(async (otherUserId) => {
    if (!currentUser || !otherUserId) return
    try {
      await apiFetch('/api/messages/read', {
        method: 'POST',
        body: JSON.stringify({ otherUserId })
      })
    } catch (error) {
      console.error('Error marking chat read:', error)
    }
  }, [currentUser, apiFetch])

  const markMessagesAsReadForUser = useCallback(async (senderId) => {
    const unreadNotifs = notifications.filter(n => n.type === 'message' && n.taskId === senderId && !n.read)
    if (unreadNotifs.length === 0) return

    try {
      const batch = writeBatch(db)
      unreadNotifs.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }))
      await batch.commit()
    } catch (error) {
      console.error('Failed to clear message notifications:', error)
    }
  }, [notifications])

  const fetchChatHistory = useCallback(async (otherUserId) => {
    if (!currentUser || !otherUserId) return []
    try {
      return await apiFetch(`/api/messages/${encodeURIComponent(otherUserId)}`)
    } catch (error) {
      console.error('Error fetching chat history:', error)
      showToast('Could not load this conversation', 'error')
      return []
    }
  }, [currentUser, apiFetch, showToast])

  const markNotificationAsRead = useCallback(async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true })
    } catch { showToast('Failed to update notification', 'error') }
  }, [showToast])

  const markNotificationAsUnread = useCallback(async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: false })
    } catch { showToast('Failed to update notification', 'error') }
  }, [showToast])

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const unread = notifications.filter(n => !n.read)
      if (unread.length === 0) return
      const batch = writeBatch(db)
      unread.forEach(n => batch.update(doc(db, 'notifications', n.id), { read: true }))
      await batch.commit()
      showToast('All notifications marked as read', 'success')
    } catch { showToast('Failed to update notifications', 'error') }
  }, [notifications, showToast])

  const deleteNotification = useCallback(async (notifId) => {
    try {
      await deleteDoc(doc(db, 'notifications', notifId))
    } catch { showToast('Failed to delete notification', 'error') }
  }, [showToast])

  const clearNotifications = useCallback(async () => {
    try {
      const batch = writeBatch(db)
      notifications.forEach(n => batch.delete(doc(db, 'notifications', n.id)))
      await batch.commit()
      showToast('Inbox cleared successfully', 'success')
    } catch { showToast('Failed to clear inbox', 'error') }
  }, [notifications, showToast])

  // Help menu → "Contact Admin": delivers the note to every admin's inbox
  const contactAdmins = useCallback(async (text) => {
    const admins = members.filter(m => m.role === 'admin' && m.id !== currentUser?.uid)
    if (admins.length === 0) {
      showToast('There are no other admins to contact', 'info')
      return false
    }
    await Promise.all(admins.map(a => triggerNotification(a.id, 'support', `needs help: ${clip(text, 400)}`, currentUser.uid)))
    showToast('Your message was sent to the workspace admins', 'success')
    return true
  }, [members, currentUser, triggerNotification, showToast])

  const adjustProductivityScore = useCallback(async (userId, amount, reason) => {
    try {
      // 1. Update the actual score (Critical)
      await updateDoc(doc(db, 'users', userId), { productivityScore: increment(amount) })

      const member = members.find(m => m.id === userId)
      const actionWord = amount > 0 ? `awarded you ${amount} XP` : `deducted ${Math.abs(amount)} XP from your profile`

      // 2. Try to notify the user (Non-critical)
      await triggerNotification(userId, 'system', `${actionWord}. Reason: ${reason}`, 'leaderboard')

      // 3. Log to the audit log + Leaderboard ticker
      await logGlobalActivity(`Adjusted ${member?.name || 'User'}'s XP by ${amount}. Reason: ${reason}`, 'xp')

      showToast('XP Adjusted Successfully', 'success')
      return true
    } catch (error) {
      console.error('Error adjusting XP:', error)
      showToast('Failed to adjust XP', 'error')
      return false
    }
  }, [triggerNotification, logGlobalActivity, members, showToast])

  const resetAllProductivityScores = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'))
      // Firestore batches cap at 500 writes
      for (let i = 0; i < snapshot.docs.length; i += 450) {
        const batch = writeBatch(db)
        snapshot.docs.slice(i, i + 450).forEach(docSnap => batch.update(docSnap.ref, { productivityScore: 0 }))
        await batch.commit()
      }
      await logGlobalActivity('Reset the entire leaderboard for a new season', 'xp')
      showToast('Season reset successfully! All XP cleared.', 'success')
    } catch { showToast('Failed to reset leaderboard', 'error') }
  }, [logGlobalActivity, showToast])

  const addProject = useCallback(async (projectData) => {
    try {
      const newProject = {
        name: projectData.name,
        icon: projectData.icon || 'square',
        createdAt: serverTimestamp(),
        spaceId: projectData.spaceId || rawSpaces[0]?.id || ''
      }
      const docRef = await addDoc(collection(db, 'projects'), newProject)
      await logGlobalActivity(`Created project "${projectData.name}"`, 'project')
      showToast('Project created', 'success')
      return { id: docRef.id, ...newProject }
    } catch { showToast('Failed to create project', 'error') }
  }, [logGlobalActivity, showToast, rawSpaces])

  const updateProject = useCallback(async (projectId, updates) => {
    try {
      await updateDoc(doc(db, 'projects', projectId), updates)
      if (updates.name) {
        await logGlobalActivity(`Renamed a project to "${updates.name}"`, 'project')
      }
    } catch { showToast('Failed to update project', 'error') }
  }, [logGlobalActivity, showToast])

  // Server cascades the delete to the project's tasks (and their comments/activity)
  const deleteProject = useCallback(async (projectId) => {
    try {
      const { removedTasks } = await apiFetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      showToast(`Project deleted${removedTasks ? ` with ${removedTasks} task(s)` : ''}`, 'success')
      return true
    } catch (error) {
      showToast(error.message || 'Failed to delete project', 'error')
      return false
    }
  }, [apiFetch, showToast])

  const toggleProjectFavorite = useCallback(async (projectId) => {
    if (!currentUser) return
    const isFavorite = (myProfile?.favoriteProjects || []).includes(projectId)
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        favoriteProjects: isFavorite ? arrayRemove(projectId) : arrayUnion(projectId)
      })
    } catch (error) {
      console.error('Error toggling favorite:', error)
      showToast('Failed to update favorites', 'error')
    }
  }, [currentUser, myProfile?.favoriteProjects, showToast])

  const moveTask = useCallback((taskId, newStatus) => setTaskStatus(taskId, newStatus), [setTaskStatus])

  const getMemberById = useCallback((id) => members.find(m => m.id === id), [members])

  // Expanded/collapsed is a personal view preference, so it stays in this browser
  const toggleSpaceExpanded = useCallback((spaceId) => {
    setCollapsedSpaces(prev => {
      const next = prev.includes(spaceId) ? prev.filter(id => id !== spaceId) : [...prev, spaceId]
      try { localStorage.setItem(COLLAPSED_SPACES_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
      return next
    })
  }, [])

  const addSpace = useCallback(async (spaceName) => {
    try {
      const newSpace = { name: spaceName, icon: 'folder', createdAt: serverTimestamp() }
      const docRef = await addDoc(collection(db, 'spaces'), newSpace)
      await logGlobalActivity(`Created space "${spaceName}"`, 'space')
      showToast('Space added', 'success')
      return { id: docRef.id, ...newSpace }
    } catch (error) {
      console.error('Error adding space: ', error)
      showToast('Failed to create space', 'error')
    }
  }, [logGlobalActivity, showToast])

  // Server cascades to the space's projects and their tasks
  const deleteSpace = useCallback(async (spaceId) => {
    try {
      const { removedProjects } = await apiFetch(`/api/spaces/${spaceId}`, { method: 'DELETE' })
      showToast(`Space deleted${removedProjects ? ` with ${removedProjects} project(s)` : ''}`, 'success')
      return true
    } catch (error) {
      console.error('Error deleting space: ', error)
      showToast(error.message || 'Failed to delete space', 'error')
      return false
    }
  }, [apiFetch, showToast])

  const updateMemberRole = useCallback(async (userId, newRole) => {
    try {
      const member = members.find(m => m.id === userId)
      await updateDoc(doc(db, 'users', userId), { role: newRole })
      await logGlobalActivity(`Changed role of ${member?.name || 'User'} to ${newRole}`, 'user')
      showToast('Member role updated', 'success')
    } catch { showToast('Failed to update member role', 'error') }
  }, [members, logGlobalActivity, showToast])

  // Deletes the Auth account + profile server-side and unassigns their tasks
  const removeMember = useCallback(async (userId) => {
    try {
      await apiFetch(`/api/users/${userId}`, { method: 'DELETE' })
      showToast('Member removed from workspace', 'success')
    } catch (error) {
      showToast(error.message || 'Failed to remove member', 'error')
    }
  }, [apiFetch, showToast])

  const value = {
    tasks: visibleTasks,
    projects,
    members,
    myProfile,
    spaces,
    notifications,
    globalActivities,
    xpActivities,
    realtimeMessages,
    setRealtimeMessages,
    activeTask,
    isDrawerOpen,
    openTaskDrawer,
    closeTaskDrawer,
    addTask,
    updateTask,
    deleteTask,
    duplicateTask,
    moveTask,
    toggleTaskWatch,
    addSubtask,
    toggleSubtask,
    editSubtask,
    deleteSubtask,
    addComment,
    sendMessage,
    markChatAsRead,
    markMessagesAsReadForUser,
    fetchChatHistory,
    getMemberById,
    removeMember,
    updateMemberRole,
    addProject,
    updateProject,
    deleteProject,
    toggleProjectFavorite,
    toggleSpaceExpanded,
    addSpace,
    deleteSpace,
    markNotificationAsRead,
    markNotificationAsUnread,
    markAllNotificationsAsRead,
    deleteNotification,
    clearNotifications,
    contactAdmins,
    adjustProductivityScore,
    resetAllProductivityScores,
    showToast,
    confirmAction,
    currentUser,
    apiFetch
  }

  const getToastStyles = (type) => {
    if (type === 'error') return { bg: 'bg-card border-red-500/30 text-red-400', icon: <AlertCircle size={18} /> }
    if (type === 'info') return { bg: 'bg-card border-edge text-neutral-200', icon: <Info size={18} /> }
    return { bg: 'bg-card border-green-500/30 text-green-400', icon: <CheckCircle2 size={18} /> }
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border ${getToastStyles(toast.type).bg}`}>
            {getToastStyles(toast.type).icon}
            <span className="font-medium text-sm pr-4">{toast.msg}</span>
            <button onClick={() => setToast(null)} aria-label="Dismiss notification" className="opacity-50 hover:opacity-100 transition-opacity">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {confirmConfig && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmConfig(null)} />
          <div className="relative z-10 w-full max-w-md bg-card border border-raised rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              {confirmConfig.type === 'danger' ? <AlertTriangle className="text-red-500" size={24} /> : <Info className="text-accent-500" size={24} />}
              <h3 id="confirm-title" className="text-lg font-bold text-white">{confirmConfig.title}</h3>
            </div>
            <p className="text-neutral-300 text-sm leading-relaxed mb-6">{confirmConfig.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmConfig(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:bg-raised transition-colors">Cancel</button>
              <button
                autoFocus
                onClick={() => { confirmConfig.onConfirm(); setConfirmConfig(null) }}
                className={`px-6 py-2 rounded-lg text-sm font-bold text-white transition-colors ${confirmConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' : 'bg-accent-600 hover:bg-accent-500'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ProjectContext.Provider>
  )
}

export const useProject = () => {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider')
  }
  return context
}
