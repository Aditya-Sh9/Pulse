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
  writeBatch
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from '../config/firebase'
import { useAuth } from './AuthContext'
import confetti from 'canvas-confetti'
import { AlertCircle, CheckCircle2, X, Info } from 'lucide-react'
import { io } from 'socket.io-client'
import Modal from '../components/Modal'
import { AlertTriangle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const COLLAPSED_SPACES_KEY = 'pulse:collapsedSpaces'
const UNDO_WINDOW_MS = 6000
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

// Fields a client is allowed to set when creating or duplicating a task
const TASK_FIELDS = ['title', 'description', 'priority', 'assigneeId', 'dueDate', 'status', 'projectId', 'labels', 'recurrence', 'blockedBy', 'order']

const clip = (text, max) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

const readCollapsedSpaces = () => {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSED_SPACES_KEY)) || []
  } catch {
    return []
  }
}

// Position within a board column: explicit `order`, else creation time
export const taskSortKey = (t) => t.order ?? t.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER

const showDesktopNotification = (title, body, tag) => {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted' || !document.hidden) return
    const n = new Notification(title, { body, tag, icon: '/pulse.svg' })
    n.onclick = () => { window.focus(); n.close() }
  } catch {
    // Some browsers (e.g. iOS Safari) expose Notification but throw on construction
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
  const [unreadCounts, setUnreadCounts] = useState({})
  const [typingFrom, setTypingFrom] = useState({})
  const [rawSpaces, setRawSpaces] = useState([])
  const [collapsedSpaces, setCollapsedSpaces] = useState(readCollapsedSpaces)
  const [loaded, setLoaded] = useState({ tasks: false, projects: false, members: false, notifications: false })

  const [activeTaskId, setActiveTaskId] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Status changes go through the API; keep them applied locally until the snapshot catches up
  const [pendingStatus, setPendingStatus] = useState({})
  const [pendingOrder, setPendingOrder] = useState({})
  // Deletes wait out an undo window before hitting Firestore
  const [pendingDeletes, setPendingDeletes] = useState(() => new Set())
  const deleteTimers = useRef({})

  const markLoaded = useCallback((key) => setLoaded(prev => (prev[key] ? prev : { ...prev, [key]: true })), [])

  // --- GLOBAL TOAST SYSTEM (optionally with an action, e.g. Undo) ---
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const showToast = useCallback((msg, type = 'error', { action, duration } = {}) => {
    clearTimeout(toastTimer.current)
    setToast({ msg, type, action, id: Date.now() })
    toastTimer.current = setTimeout(() => setToast(null), duration || (action ? UNDO_WINDOW_MS : 4000))
  }, [])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  // --- GLOBAL CONFIRM DIALOG SYSTEM ---
  const [confirmConfig, setConfirmConfig] = useState(null)

  const confirmAction = useCallback((title, message, onConfirm, type = 'danger') => {
    setConfirmConfig({ title, message, onConfirm, type })
  }, [])

  const closeConfirm = useCallback(() => setConfirmConfig(null), [])

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
    const hasOverrides = Object.keys(pendingStatus).length > 0 || Object.keys(pendingOrder).length > 0
    let list = pendingDeletes.size > 0 ? tasks.filter(t => !pendingDeletes.has(t.id)) : tasks
    if (hasOverrides) {
      list = list.map(t => {
        if (!pendingStatus[t.id] && pendingOrder[t.id] === undefined) return t
        return {
          ...t,
          ...(pendingStatus[t.id] ? { status: pendingStatus[t.id] } : {}),
          ...(pendingOrder[t.id] !== undefined ? { order: pendingOrder[t.id] } : {})
        }
      })
    }
    return list
  }, [tasks, pendingStatus, pendingOrder, pendingDeletes])

  const allLabels = useMemo(() => {
    const set = new Set()
    tasks.forEach(t => (t.labels || []).forEach(l => set.add(l)))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [tasks])

  const activeTask = useMemo(
    () => (activeTaskId ? visibleTasks.find(t => t.id === activeTaskId) || null : null),
    [activeTaskId, visibleTasks]
  )

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
      const error = new Error(data?.message || `Request failed (${response.status})`)
      error.status = response.status
      error.data = data
      throw error
    }
    return data
  }, [getAuthToken])

  // --- REAL-TIME SOCKET (authenticated with the Firebase ID token) ---
  useEffect(() => {
    if (!currentUser) return
    const newSocket = io(API_URL, {
      // Callback form fetches a fresh token on every (re)connect, so expiry never strands the socket
      auth: (cb) => { getAuthToken().then(token => cb({ token })).catch(() => cb({})) }
    })
    socketRef.current = newSocket
    const typingTimers = {}

    newSocket.on('connect_error', (err) => console.error('Socket connection failed:', err.message))

    newSocket.on('receive_message', (message) => {
      setRealtimeMessages(prev => [...prev, message])
      setTypingFrom(prev => ({ ...prev, [message.senderId]: false }))
      // Don't badge or toast a conversation that's already on screen
      if (window.location.pathname !== `/dashboard/messages/${message.senderId}`) {
        setUnreadCounts(prev => ({ ...prev, [message.senderId]: (prev[message.senderId] || 0) + 1 }))
        showToast('New message received', 'success')
        showDesktopNotification('New message', clip(message.text, 120), `msg-${message.senderId}`)
      }
    })

    newSocket.on('message_sent', (message) => {
      setRealtimeMessages(prev => (prev.some(m => m._id === message._id) ? prev : [...prev, message]))
    })

    // Read receipts for messages this user sent
    newSocket.on('messages_read', ({ chatId, readAt }) => {
      setRealtimeMessages(prev => prev.map(m => (
        m.chatId === chatId && m.senderId === currentUser.uid && !m.read ? { ...m, read: true, readAt } : m
      )))
    })

    // Typing indicator auto-expires if the "stopped typing" event is lost
    newSocket.on('typing', ({ from, isTyping }) => {
      clearTimeout(typingTimers[from])
      setTypingFrom(prev => ({ ...prev, [from]: isTyping }))
      if (isTyping) typingTimers[from] = setTimeout(() => setTypingFrom(prev => ({ ...prev, [from]: false })), 5000)
    })

    apiFetch('/api/messages/unread')
      .then(counts => setUnreadCounts(counts || {}))
      .catch(error => console.error('Failed to load unread counts:', error))

    return () => {
      Object.values(typingTimers).forEach(clearTimeout)
      newSocket.disconnect()
      socketRef.current = null
    }
  }, [currentUser, getAuthToken, showToast, apiFetch])

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
  const refreshXpActivities = useCallback(() => {
    apiFetch('/api/activities/xp')
      .then(logs => setXpActivities(logs))
      .catch(error => console.error('Failed to fetch XP activity:', error))
  }, [apiFetch])

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
            ? data.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
            : '??',
          status: data.status || 'offline',
          productivityScore: data.productivityScore || 0
        }
      }))
      markLoaded('members')
    })
    return () => unsubscribe()
  }, [currentUser, markLoaded])

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
      markLoaded('projects')
    })
    return () => unsubscribe()
  }, [currentUser, markLoaded])

  // Fetch Tasks
  useEffect(() => {
    if (!currentUser) return
    const unsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const freshTasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setTasks(freshTasks)
      markLoaded('tasks')
      // Drop optimistic values the server has confirmed
      const settle = (field) => (prev) => {
        const next = { ...prev }
        let changed = false
        for (const [id, value] of Object.entries(prev)) {
          const t = freshTasks.find(x => x.id === id)
          if (!t || t[field] === value) { delete next[id]; changed = true }
        }
        return changed ? next : prev
      }
      setPendingStatus(settle('status'))
      setPendingOrder(settle('order'))
    })
    return () => unsubscribe()
  }, [currentUser, markLoaded])

  // Fetch Notifications (and surface new ones as desktop notifications when the tab is hidden)
  useEffect(() => {
    if (!currentUser) return
    let initial = true
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })))
      markLoaded('notifications')
      if (!initial) {
        snapshot.docChanges()
          .filter(c => c.type === 'added' && !c.doc.data().read)
          .forEach(c => {
            const n = c.doc.data()
            showDesktopNotification(n.senderName || 'Pulse', n.message, c.doc.id)
          })
      }
      initial = false
    })
    return () => unsubscribe()
  }, [currentUser, markLoaded])

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
    // Respect the recipient's task-notification preference
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
        labels: newTask.labels || [],
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

  // Status is server-authoritative (it drives XP, dependencies and recurrence)
  const setTaskStatus = useCallback(async (taskId, status) => {
    const oldTask = tasks.find(t => t.id === taskId)
    if (!oldTask || oldTask.status === status) return true

    setPendingStatus(prev => ({ ...prev, [taskId]: status }))
    try {
      const result = await apiFetch(`/api/tasks/${taskId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      if (status === 'COMPLETE') {
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#45C1AA', '#F57D43', '#10B981'], zIndex: 9999, disableForReducedMotion: true })
        if (result?.nextOccurrenceId) showToast('Done! The next occurrence has been scheduled.', 'success')
        else if (result?.xpDelta === 0 && oldTask.assigneeId) showToast('Completed. Daily XP cap reached, so no XP this time.', 'info')
      }
      return true
    } catch (error) {
      setPendingStatus(prev => {
        const next = { ...prev }
        delete next[taskId]
        return next
      })
      const blockers = error.data?.blockedBy
      showToast(blockers?.length ? `Finish first: ${blockers.map(b => `"${b.title}"`).join(', ')}` : (error.message || 'Failed to update status'), 'error')
      return false
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
      if (fields.recurrence !== undefined && fields.recurrence !== (oldTask.recurrence || '')) {
        await logTaskActivity(taskId, fields.recurrence ? `set this task to repeat ${fields.recurrence}` : 'stopped this task repeating')
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

  // Archive/unarchive with a one-click Undo
  const setTaskArchived = useCallback(async (task, archived) => {
    await updateTask(task.id, { isArchived: archived })
    showToast(archived ? `Archived "${clip(task.title || 'task', 40)}"` : 'Task restored', 'success', archived ? {
      action: { label: 'Undo', onClick: () => updateTask(task.id, { isArchived: false }) }
    } : {})
  }, [updateTask, showToast])

  const commitDelete = useCallback(async (task) => {
    delete deleteTimers.current[task.id]
    try {
      await deleteDoc(doc(db, 'tasks', task.id))
      await logGlobalActivity(`Deleted task "${task.title || 'Unknown'}"`, 'task')
    } catch (error) {
      console.error('Error deleting task: ', error)
      showToast(error.code === 'permission-denied' ? 'Only admins can delete tasks' : 'Failed to delete task', 'error')
    } finally {
      setPendingDeletes(prev => {
        const next = new Set(prev)
        next.delete(task.id)
        return next
      })
    }
  }, [logGlobalActivity, showToast])

  // Hide immediately, delete after the undo window
  const deleteTask = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    if (userRole !== 'admin') {
      showToast('Only admins can delete tasks', 'error')
      return
    }
    setPendingDeletes(prev => new Set(prev).add(taskId))
    if (activeTaskId === taskId) closeTaskDrawer()
    deleteTimers.current[taskId] = setTimeout(() => commitDelete(task), UNDO_WINDOW_MS)
    showToast(`Deleted "${clip(task.title || 'task', 40)}"`, 'success', {
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(deleteTimers.current[taskId])
          delete deleteTimers.current[taskId]
          setPendingDeletes(prev => {
            const next = new Set(prev)
            next.delete(taskId)
            return next
          })
          showToast('Task restored', 'info')
        }
      }
    })
  }, [tasks, userRole, activeTaskId, closeTaskDrawer, commitDelete, showToast])

  // Leaving the workspace (logout/unmount) finalizes deletes that were still in their undo window
  useEffect(() => {
    const timers = deleteTimers.current
    const flush = () => {
      Object.keys(timers).forEach(id => {
        clearTimeout(timers[id])
        deleteDoc(doc(db, 'tasks', id)).catch(() => {})
        delete timers[id]
      })
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  const duplicateTask = useCallback((task) => addTask({
    ...task,
    title: `${task.title} (Copy)`,
    order: undefined,
    subtasks: (task.subtasks || []).map((s, i) => ({ ...s, id: Date.now() + i, completed: false }))
  }), [addTask])

  // Board drag & drop: place `taskId` in `status` just before `beforeTaskId` (null = end of column)
  const reorderTask = useCallback(async (taskId, status, beforeTaskId) => {
    const column = visibleTasks
      .filter(t => t.status === status && t.id !== taskId && t.projectId === tasks.find(x => x.id === taskId)?.projectId && !t.isArchived)
      .sort((a, b) => taskSortKey(a) - taskSortKey(b))
    const index = beforeTaskId ? column.findIndex(t => t.id === beforeTaskId) : column.length
    const prev = index > 0 ? taskSortKey(column[index - 1]) : null
    const next = index >= 0 && index < column.length ? taskSortKey(column[index]) : null
    const order = prev === null && next === null ? Date.now()
      : prev === null ? next - 1024
        : next === null ? prev + 1024
          : (prev + next) / 2

    setPendingOrder(p => ({ ...p, [taskId]: order }))
    const task = tasks.find(t => t.id === taskId)
    if (task && task.status !== status) {
      const ok = await setTaskStatus(taskId, status)
      if (!ok) {
        setPendingOrder(p => { const n = { ...p }; delete n[taskId]; return n })
        return
      }
    }
    try {
      await updateDoc(doc(db, 'tasks', taskId), { order })
    } catch (error) {
      console.error('Error reordering task:', error)
      setPendingOrder(p => { const n = { ...p }; delete n[taskId]; return n })
      showToast('Failed to move task', 'error')
    }
  }, [visibleTasks, tasks, setTaskStatus, showToast])

  // "Remind me": the daily job notifies watchers the day before a task is due
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

  // --- Attachments (Firebase Storage: tasks/{taskId}/{uid}/{file}) ---
  const uploadFile = useCallback(async (taskId, file) => {
    if (file.size > MAX_ATTACHMENT_BYTES) throw new Error(`"${file.name}" is larger than 10 MB`)
    const safeName = file.name.replace(/[^\w.-]+/g, '_').slice(-120)
    const path = `tasks/${taskId}/${currentUser.uid}/${Date.now()}-${safeName}`
    const fileRef = storageRef(storage, path)
    await uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' })
    return {
      name: file.name,
      path,
      url: await getDownloadURL(fileRef),
      size: file.size,
      type: file.type || '',
      uploadedBy: currentUser.uid,
      uploadedAt: new Date().toISOString()
    }
  }, [currentUser])

  const addTaskAttachments = useCallback(async (taskId, files) => {
    const uploaded = []
    for (const file of files) {
      try {
        uploaded.push(await uploadFile(taskId, file))
      } catch (error) {
        console.error('Upload failed:', error)
        showToast(error.message?.includes('10 MB') ? error.message : `Couldn’t upload "${file.name}". Is Firebase Storage enabled?`, 'error')
      }
    }
    if (uploaded.length === 0) return
    try {
      await updateDoc(doc(db, 'tasks', taskId), { attachments: arrayUnion(...uploaded) })
      await logTaskActivity(taskId, `attached ${uploaded.length === 1 ? `"${uploaded[0].name}"` : `${uploaded.length} files`}`)
      showToast(uploaded.length === 1 ? 'File attached' : `${uploaded.length} files attached`, 'success')
    } catch (error) {
      console.error('Error saving attachments:', error)
      showToast('Failed to save attachment', 'error')
    }
  }, [uploadFile, logTaskActivity, showToast])

  const removeTaskAttachment = useCallback(async (task, attachment) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        attachments: (task.attachments || []).filter(a => a.path !== attachment.path)
      })
      // Only the uploader can delete the stored object; others just unlink it
      if (attachment.uploadedBy === currentUser?.uid) {
        await deleteObject(storageRef(storage, attachment.path)).catch(() => {})
      }
      showToast('Attachment removed', 'info')
    } catch (error) {
      console.error('Error removing attachment:', error)
      showToast('Failed to remove attachment', 'error')
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

  const addComment = useCallback(async (taskId, text, files = []) => {
    try {
      const attachments = []
      for (const file of files) {
        try {
          attachments.push(await uploadFile(taskId, file))
        } catch (error) {
          showToast(error.message?.includes('10 MB') ? error.message : `Couldn’t upload "${file.name}"`, 'error')
        }
      }
      if (!text.trim() && attachments.length === 0) return false

      await addDoc(collection(db, 'tasks', taskId, 'comments'), {
        text: clip(text.trim() || ' ', 2000),
        attachments,
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
      return true
    } catch (error) {
      console.error('Error adding comment: ', error)
      showToast('Failed to add comment', 'error')
      return false
    }
  }, [members, currentUser, actorName, uploadFile, triggerNotification, logGlobalActivity, showToast])

  // --- Direct messages ---
  const sendMessage = useCallback((receiverId, text) => {
    const socket = socketRef.current
    if (!currentUser || !receiverId || !text.trim() || !socket) return
    if (!socket.connected) {
      showToast('Reconnecting to chat… try again in a moment', 'info')
      return
    }
    socket.emit('typing', { receiverId, isTyping: false })
    socket.emit('send_message', { receiverId, text }, (response) => {
      if (!response?.ok) showToast(response?.error || 'Message could not be sent', 'error')
    })
  }, [currentUser, showToast])

  const sendTyping = useCallback((receiverId, isTyping) => {
    socketRef.current?.emit('typing', { receiverId, isTyping })
  }, [])

  const markChatAsRead = useCallback(async (otherUserId) => {
    if (!currentUser || !otherUserId) return
    setUnreadCounts(prev => (prev[otherUserId] ? { ...prev, [otherUserId]: 0 } : prev))
    try {
      await apiFetch('/api/messages/read', {
        method: 'POST',
        body: JSON.stringify({ otherUserId })
      })
    } catch (error) {
      console.error('Error marking chat read:', error)
    }
  }, [currentUser, apiFetch])

  // Returns { messages (oldest first), hasMore }; pass `before` (ISO date) for older pages
  const fetchChatHistory = useCallback(async (otherUserId, before) => {
    if (!currentUser || !otherUserId) return { messages: [], hasMore: false }
    try {
      const qs = before ? `?before=${encodeURIComponent(before)}` : ''
      return await apiFetch(`/api/messages/${encodeURIComponent(otherUserId)}${qs}`)
    } catch (error) {
      console.error('Error fetching chat history:', error)
      showToast('Could not load this conversation', 'error')
      return { messages: [], hasMore: false }
    }
  }, [currentUser, apiFetch, showToast])

  // --- Notifications ---
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

  // Browser notifications while the tab is in the background (opt-in, per user)
  const setDesktopNotifications = useCallback(async (enabled) => {
    if (!currentUser) return false
    if (enabled) {
      if (typeof Notification === 'undefined') {
        showToast('This browser doesn’t support desktop notifications', 'error')
        return false
      }
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        showToast('Notifications are blocked. Allow them in your browser’s site settings.', 'error')
        return false
      }
    }
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { desktopNotifications: enabled })
      return true
    } catch {
      showToast('Could not save your preference', 'error')
      return false
    }
  }, [currentUser, showToast])

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

  // --- Saved filters (per user) ---
  const saveFilter = useCallback(async (name, filter) => {
    if (!currentUser) return
    const entry = { id: `${Date.now()}`, name: clip(name.trim(), 40), ...filter }
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { savedFilters: arrayUnion(entry) })
      showToast(`Saved view "${entry.name}"`, 'success')
      return entry
    } catch {
      showToast('Could not save this view', 'error')
    }
  }, [currentUser, showToast])

  const deleteFilter = useCallback(async (filterId) => {
    if (!currentUser) return
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        savedFilters: (myProfile?.savedFilters || []).filter(f => f.id !== filterId)
      })
    } catch {
      showToast('Could not delete this view', 'error')
    }
  }, [currentUser, myProfile?.savedFilters, showToast])

  // --- XP / Leaderboard ---
  const adjustProductivityScore = useCallback(async (userId, amount, reason) => {
    try {
      await updateDoc(doc(db, 'users', userId), { productivityScore: increment(amount) })

      const member = members.find(m => m.id === userId)
      const actionWord = amount > 0 ? `awarded you ${amount} XP` : `deducted ${Math.abs(amount)} XP from your profile`

      await triggerNotification(userId, 'system', `${actionWord}. Reason: ${reason}`, 'leaderboard')
      await logGlobalActivity(`Adjusted ${member?.name || 'User'}'s XP by ${amount}. Reason: ${reason}`, 'xp')

      showToast('XP Adjusted Successfully', 'success')
      return true
    } catch (error) {
      console.error('Error adjusting XP:', error)
      showToast('Failed to adjust XP', 'error')
      return false
    }
  }, [triggerNotification, logGlobalActivity, members, showToast])

  // Archives current standings as a season on the server, then resets everyone's XP
  const closeSeason = useCallback(async (name) => {
    try {
      const { number } = await apiFetch('/api/leaderboard/seasons', { method: 'POST', body: JSON.stringify({ name }) })
      refreshXpActivities()
      showToast(`Season ${number} archived. A new season has started!`, 'success')
      return true
    } catch (error) {
      showToast(error.message || 'Failed to start a new season', 'error')
      return false
    }
  }, [apiFetch, refreshXpActivities, showToast])

  // --- Projects & spaces ---
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
    loading: { tasks: !loaded.tasks, projects: !loaded.projects, members: !loaded.members, notifications: !loaded.notifications },
    projects,
    members,
    myProfile,
    spaces,
    allLabels,
    notifications,
    globalActivities,
    xpActivities,
    realtimeMessages,
    setRealtimeMessages,
    unreadCounts,
    typingFrom,
    activeTask,
    isDrawerOpen,
    openTaskDrawer,
    closeTaskDrawer,
    addTask,
    updateTask,
    deleteTask,
    setTaskArchived,
    duplicateTask,
    moveTask,
    reorderTask,
    toggleTaskWatch,
    addTaskAttachments,
    removeTaskAttachment,
    addSubtask,
    toggleSubtask,
    editSubtask,
    deleteSubtask,
    addComment,
    sendMessage,
    sendTyping,
    markChatAsRead,
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
    setDesktopNotifications,
    contactAdmins,
    saveFilter,
    deleteFilter,
    adjustProductivityScore,
    closeSeason,
    showToast,
    confirmAction,
    currentUser,
    apiFetch
  }

  const getToastStyles = (type) => {
    if (type === 'error') return { bg: 'bg-card border-red-500/30 text-red-400', icon: <AlertCircle size={18} aria-hidden="true" /> }
    if (type === 'info') return { bg: 'bg-card border-edge text-neutral-200', icon: <Info size={18} aria-hidden="true" /> }
    return { bg: 'bg-card border-green-500/30 text-green-400', icon: <CheckCircle2 size={18} aria-hidden="true" /> }
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}

      {/* Always-mounted live region so screen readers announce every toast */}
      <div role="status" aria-live="polite" className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-[9999] pointer-events-none flex justify-end">
        {toast && (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2.5 rounded-lg shadow-2xl border animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-md ${getToastStyles(toast.type).bg}`}>
            {getToastStyles(toast.type).icon}
            <span className="font-medium text-sm flex-1">{toast.msg}</span>
            {toast.action && (
              <button
                onClick={() => { toast.action.onClick(); setToast(null) }}
                className="px-3 py-1.5 rounded-md text-sm font-semibold text-white bg-raised hover:bg-edge transition-colors"
              >
                {toast.action.label}
              </button>
            )}
            <button onClick={() => setToast(null)} aria-label="Dismiss notification" className="p-1.5 rounded-md opacity-60 hover:opacity-100 hover:bg-raised transition">
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {confirmConfig && (
        <Modal onClose={closeConfirm} role="alertdialog" labelledBy="confirm-title" z="z-[9998]" className="max-w-md bg-card border border-raised rounded-xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            {confirmConfig.type === 'danger' ? <AlertTriangle className="text-red-500" size={24} aria-hidden="true" /> : <Info className="text-accent-500" size={24} aria-hidden="true" />}
            <h3 id="confirm-title" className="text-lg font-bold text-white">{confirmConfig.title}</h3>
          </div>
          <p className="text-neutral-300 text-sm leading-relaxed mb-6">{confirmConfig.message}</p>
          <div className="flex justify-end gap-3">
            <button onClick={closeConfirm} className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-300 hover:bg-raised transition-colors">Cancel</button>
            <button
              autoFocus
              onClick={() => { confirmConfig.onConfirm(); setConfirmConfig(null) }}
              className={`px-6 py-2 rounded-lg text-sm font-bold text-white transition-colors ${confirmConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' : 'bg-accent-600 hover:bg-accent-500'}`}
            >
              Confirm
            </button>
          </div>
        </Modal>
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
