import React, { createContext, useState, useCallback, useEffect, useContext } from 'react'
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

export const ProjectContext = createContext()

export const ProjectProvider = ({ children }) => {
  const { currentUser, getAuthToken } = useAuth()

  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [members, setMembers] = useState([])
  const [notifications, setNotifications] = useState([])
  const [globalActivities, setGlobalActivities] = useState([])
  const [socket, setSocket] = useState(null)
  const [realtimeMessages, setRealtimeMessages] = useState([])

  const [activeTask, setActiveTask] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Initialize spaces as empty array, it will be populated from Firestore
  const [spaces, setSpaces] = useState([])

  // --- GLOBAL TOAST SYSTEM ---
  const [toast, setToast] = useState(null)

  const showToast = useCallback((msg, type = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // --- GLOBAL CONFIRM DIALOG SYSTEM ---
  const [confirmConfig, setConfirmConfig] = useState(null)

  const confirmAction = useCallback((title, message, onConfirm, type = 'danger') => {
    setConfirmConfig({ title, message, onConfirm, type })
  }, [])

  useEffect(() => {
    if (!currentUser) return;
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.emit('register', currentUser.uid);

    newSocket.on('receive_message', (message) => {
      setRealtimeMessages(prev => [...prev, message]);
      showToast(`New message received`, 'success');
    });

    newSocket.on('message_sent', (message) => {
      setRealtimeMessages(prev => [...prev, message]);
    });

    return () => newSocket.disconnect();
  }, [currentUser, showToast]);

  const apiFetch = useCallback(async (endpoint, options = {}) => {
    try {
      const token = await getAuthToken();
      if (!token && options.requiresAuth !== false) throw new Error("No auth token");

      const baseUrl = 'http://localhost:5000';
      const response = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error in apiFetch [${endpoint}]:`, error);
      throw error;
    }
  }, [getAuthToken])

  const logGlobalActivity = useCallback(async (actionText, type = 'system', metadata = {}) => {
    if (!currentUser) return;
    try {
      const newLogData = {
        action: actionText,
        type,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email || 'System',
        userAvatar: currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U',
        metadata
      };

      const savedLog = await apiFetch('/api/activities', {
        method: 'POST',
        body: JSON.stringify(newLogData),
        requiresAuth: false
      });

      setGlobalActivities(prev => [savedLog, ...prev].slice(0, 150));
    } catch (error) {
      console.error("MongoDB Global log error:", error);
    }
  }, [currentUser, apiFetch]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchLogs = async () => {
      try {
        const logs = await apiFetch('/api/activities', { requiresAuth: false });
        setGlobalActivities(logs);
      } catch (error) {
        console.error("Failed to fetch MongoDB logs:", error);
      }
    };
    fetchLogs();
  }, [currentUser, apiFetch]);

  // Fetch Users
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        avatar: doc.data().name
          ? doc.data().name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : '??',
        status: doc.data().status || 'offline',
        productivityScore: doc.data().productivityScore || 0
      }))
      setMembers(usersList)
    })
    return () => unsubscribe()
  }, [])

  // Fetch Spaces from Firestore
  useEffect(() => {
    const q = query(collection(db, 'spaces'), orderBy('createdAt', 'asc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSpaces(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribe()
  }, [])

  // Fetch Projects
  useEffect(() => {
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'asc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribe()
  }, [])

  // Fetch Tasks
  useEffect(() => {
    const q = query(collection(db, 'tasks'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const freshTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setTasks(freshTasks)

      setActiveTask(prev => {
        if (!prev) return prev;
        const updatedTask = freshTasks.find(t => t.id === prev.id);
        return updatedTask || prev;
      })
    })
    return () => unsubscribe()
  }, [])

  // Fetch Notifications
  useEffect(() => {
    if (!currentUser) return
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    )
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribe()
  }, [currentUser])

  const logTaskActivity = useCallback(async (taskId, action) => {
    if (!currentUser) return
    try {
      await addDoc(collection(db, 'tasks', taskId, 'activities'), {
        action,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email || 'User',
        userAvatar: currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U',
        createdAt: serverTimestamp()
      })
    } catch (error) {
      console.error("Error logging activity:", error)
      showToast("Failed to log activity", 'error')
    }
  }, [currentUser, showToast])

  const triggerNotification = useCallback(async (toUserId, type, message, referenceId) => {
    if (!toUserId || toUserId === currentUser?.uid) return
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: toUserId,
        type,
        message,
        taskId: referenceId,
        read: false,
        createdAt: serverTimestamp(),
        senderName: currentUser?.displayName || 'System',
        senderAvatar: currentUser?.photoURL || null
      })
    } catch (error) {
      console.error("Failed to send notification:", error)
    }
  }, [currentUser])

  const openTaskDrawer = useCallback((task) => {
    setActiveTask(task)
    setIsDrawerOpen(true)
  }, [])

  const closeTaskDrawer = useCallback(() => {
    setIsDrawerOpen(false)
    setTimeout(() => setActiveTask(null), 300)
  }, [])

  const addTask = useCallback(async (taskData) => {
    try {
      const newTask = {
        ...taskData,
        createdAt: serverTimestamp(),
        status: taskData.status || 'TO DO',
        priority: taskData.priority || 'Normal',
        assigneeId: taskData.assigneeId || '',
        dueDate: taskData.dueDate || '',
        comments: 0,
        subtasks: []
      }
      const docRef = await addDoc(collection(db, 'tasks'), newTask)
      await logTaskActivity(docRef.id, 'created this task')
      await logGlobalActivity(`Created task: "${taskData.title}"`, 'task')

      if (taskData.assigneeId) {
        await triggerNotification(taskData.assigneeId, 'assigned', `assigned you to "${taskData.title}"`, docRef.id)
      }
      showToast('Task created successfully', 'success')
      return { id: docRef.id, ...newTask }
    } catch (error) {
      console.error("Error adding task: ", error)
      showToast('Failed to create task', 'error')
    }
  }, [triggerNotification, logTaskActivity, logGlobalActivity, showToast])

  const updateTask = useCallback(async (taskId, updates) => {
    try {
      const oldTask = tasks.find(t => t.id === taskId)
      const taskName = oldTask?.title || 'Unknown Task'

      if (updates.assigneeId && oldTask && updates.assigneeId !== oldTask.assigneeId) {
        await triggerNotification(updates.assigneeId, 'assigned', `assigned you to "${oldTask.title}"`, taskId)
      }
      if (oldTask) {
        if (updates.status && updates.status !== oldTask.status) {
          await logTaskActivity(taskId, `moved task to ${updates.status}`)
          await logGlobalActivity(`Moved task "${taskName}" to ${updates.status}`, 'task')

          if (updates.status === 'COMPLETE') {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#A855F7', '#3B82F6', '#10B981'], zIndex: 9999 })
            if (currentUser) {
              updateDoc(doc(db, 'users', currentUser.uid), { productivityScore: increment(10) }).catch(e => console.error(e))
            }
          } else if (oldTask.status === 'COMPLETE' && updates.status !== 'COMPLETE') {
            if (currentUser) {
              updateDoc(doc(db, 'users', currentUser.uid), { productivityScore: increment(-10) }).catch(e => console.error(e))
            }
          }
        }
        if (updates.priority && updates.priority !== oldTask.priority) {
          await logTaskActivity(taskId, `set priority to ${updates.priority}`)
          await logGlobalActivity(`Changed priority of "${taskName}" to ${updates.priority}`, 'task')
        }
        if (updates.title && updates.title !== oldTask.title) {
          await logGlobalActivity(`Renamed task "${oldTask.title}" to "${updates.title}"`, 'task')
        }
        if (updates.description && updates.description !== oldTask.description) {
          await logGlobalActivity(`Updated description for task "${taskName}"`, 'task')
        }
        if (updates.dueDate !== undefined && updates.dueDate !== oldTask.dueDate) {
          await logGlobalActivity(`Changed due date for "${taskName}"`, 'task')
        }
        if (updates.isArchived !== undefined && updates.isArchived !== oldTask.isArchived) {
          await logGlobalActivity(updates.isArchived ? `Archived task "${taskName}"` : `Unarchived task "${taskName}"`, 'task')
        }
        if (updates.assigneeId !== undefined && updates.assigneeId !== oldTask.assigneeId) {
          if (updates.assigneeId === '') {
            await logTaskActivity(taskId, `removed the assignee`)
            await logGlobalActivity(`Removed assignee from "${taskName}"`, 'task')
          } else {
            const member = members.find(m => m.id === updates.assigneeId)
            await logTaskActivity(taskId, `assigned this to ${member?.name || 'a teammate'}`)
            await logGlobalActivity(`Assigned "${taskName}" to ${member?.name || 'a teammate'}`, 'task')
          }
        }
      }
      const taskRef = doc(db, 'tasks', taskId)
      await updateDoc(taskRef, updates)
      if (activeTask && activeTask.id === taskId) {
        setActiveTask(prev => ({ ...prev, ...updates }))
      }
    } catch (error) {
      console.error("Error updating task: ", error)
      showToast('Failed to update task', 'error')
    }
  }, [activeTask, tasks, triggerNotification, members, logTaskActivity, logGlobalActivity, currentUser, showToast])

  const deleteTask = useCallback(async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId)
      await deleteDoc(doc(db, 'tasks', taskId))
      if (activeTask?.id === taskId) closeTaskDrawer()
      await logGlobalActivity(`Deleted task "${task?.title || 'Unknown'}"`, 'task')
      showToast('Task deleted', 'success')
    } catch (error) {
      console.error("Error deleting task: ", error)
      showToast('Failed to delete task', 'error')
    }
  }, [activeTask, tasks, closeTaskDrawer, logGlobalActivity, showToast])

  const addSubtask = useCallback(async (taskId, title) => {
    try {
      const newSubtask = { id: Date.now(), title, completed: false }
      const taskRef = doc(db, 'tasks', taskId)
      await updateDoc(taskRef, { subtasks: arrayUnion(newSubtask) })
      await logGlobalActivity(`Added subtask "${title}"`, 'task')
    } catch (error) { showToast('Failed to add subtask', 'error') }
  }, [logGlobalActivity, showToast])

  const toggleSubtask = useCallback(async (taskId, subtaskId, currentSubtasks) => {
    try {
      const subtask = currentSubtasks.find(s => s.id === subtaskId)
      const updatedSubtasks = currentSubtasks.map(s =>
        s.id === subtaskId ? { ...s, completed: !s.completed } : s
      )
      const taskRef = doc(db, 'tasks', taskId)
      await updateDoc(taskRef, { subtasks: updatedSubtasks })
      await logGlobalActivity(`${!subtask.completed ? 'Completed' : 'Unchecked'} subtask "${subtask.title}"`, 'task')
    } catch (error) { showToast('Failed to update subtask', 'error') }
  }, [logGlobalActivity, showToast])

  const editSubtask = useCallback(async (taskId, subtaskId, newTitle, currentSubtasks) => {
    try {
      const updatedSubtasks = currentSubtasks.map(s =>
        s.id === subtaskId ? { ...s, title: newTitle } : s
      )
      const taskRef = doc(db, 'tasks', taskId)
      await updateDoc(taskRef, { subtasks: updatedSubtasks })
      await logGlobalActivity(`Edited a subtask to "${newTitle}"`, 'task')
    } catch (error) { showToast('Failed to edit subtask', 'error') }
  }, [logGlobalActivity, showToast])

  const deleteSubtask = useCallback(async (taskId, subtaskId, currentSubtasks) => {
    try {
      const subtask = currentSubtasks.find(s => s.id === subtaskId)
      const updatedSubtasks = currentSubtasks.filter(s => s.id !== subtaskId)
      const taskRef = doc(db, 'tasks', taskId)
      await updateDoc(taskRef, { subtasks: updatedSubtasks })
      await logGlobalActivity(`Deleted subtask "${subtask?.title || ''}"`, 'task')
      showToast('Subtask deleted', 'success')
    } catch (error) { showToast('Failed to delete subtask', 'error') }
  }, [logGlobalActivity, showToast])

  const addComment = useCallback(async (taskId, text) => {
    try {
      await addDoc(collection(db, 'tasks', taskId, 'comments'), {
        text,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email,
        userAvatar: currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U',
        createdAt: serverTimestamp()
      })
      const taskRef = doc(db, 'tasks', taskId)
      await updateDoc(taskRef, { comments: increment(1) })
      await logGlobalActivity(`Commented on a task`, 'user')

      const words = text.split(' ')
      words.forEach(word => {
        if (word.startsWith('@')) {
          const mentionedName = word.slice(1).toLowerCase()
          const member = members.find(m => m.name && m.name.toLowerCase().includes(mentionedName))
          if (member) {
            triggerNotification(member.id, 'mention', `mentioned you in a comment`, taskId)
          }
        }
      })
    } catch (error) {
      console.error("Error adding comment: ", error)
      showToast('Failed to add comment', 'error')
    }
  }, [members, currentUser, triggerNotification, logGlobalActivity, showToast])

  const sendMessage = useCallback(async (receiverId, text) => {
    if (!currentUser || !receiverId || !text.trim() || !socket) return;

    socket.emit('send_message', {
      senderId: currentUser.uid,
      receiverId,
      text
    });

    await triggerNotification(receiverId, 'message', `sent you a message`, currentUser.uid);
  }, [currentUser, socket, triggerNotification]);

  const markChatAsRead = useCallback(async (otherUserId) => {
    if (!currentUser || !otherUserId) return;
    try {
      await apiFetch('/api/messages/read', {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.uid, otherUserId }),
        requiresAuth: false
      });
    } catch (error) {
      console.error("Error marking chat read:", error);
    }
  }, [currentUser, apiFetch]);

  const markMessagesAsReadForUser = useCallback(async (senderId) => {
    const unreadNotifs = notifications.filter(n => n.type === 'message' && n.taskId === senderId && !n.read);
    if (unreadNotifs.length === 0) return;

    try {
      const batch = writeBatch(db);
      unreadNotifs.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to clear message notifications:", error);
    }
  }, [notifications]);

  const fetchChatHistory = useCallback(async (otherUserId) => {
    if (!currentUser || !otherUserId) return [];
    try {
      const history = await apiFetch(`/api/messages/${currentUser.uid}/${otherUserId}`, { requiresAuth: false });
      return history;
    } catch (error) {
      console.error("Error fetching chat history:", error);
      return [];
    }
  }, [currentUser, apiFetch]);

  const markNotificationAsRead = useCallback(async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true })
    } catch (error) { showToast('Failed to update notification', 'error') }
  }, [showToast])

  const markNotificationAsUnread = useCallback(async (notifId) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: false })
    } catch (error) { showToast('Failed to update notification', 'error') }
  }, [showToast])

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      if (unread.length === 0) return;
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      showToast('All notifications marked as read', 'success')
    } catch (error) { showToast('Failed to update notifications', 'error') }
  }, [notifications, showToast])

  const deleteNotification = useCallback(async (notifId) => {
    try {
      await deleteDoc(doc(db, 'notifications', notifId))
    } catch (error) { showToast('Failed to delete notification', 'error') }
  }, [showToast])

  const clearNotifications = useCallback(async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
      showToast('Inbox cleared successfully', 'success');
    } catch (error) { showToast('Failed to clear inbox', 'error') }
  }, [notifications, showToast])

  const adjustProductivityScore = useCallback(async (userId, amount, reason) => {
    try {
      // 1. Update the actual score (Critical)
      await updateDoc(doc(db, 'users', userId), { productivityScore: increment(amount) })

      const member = members.find(m => m.id === userId)
      const actionWord = amount > 0 ? `awarded you ${amount} XP` : `deducted ${Math.abs(amount)} XP from your profile`;

      // 2. Try to notify the user (Non-critical)
      try {
        await triggerNotification(userId, 'system', `Admin ${actionWord}. Reason: ${reason}`, 'leaderboard')
      } catch (err) {
        console.error("Failed to notify user about XP change", err);
      }

      // 3. Try to log to the global activity feed for the Leaderboard ticker (Critical for UI)
      try {
        await logGlobalActivity(`Adjusted ${member?.name || 'User'}'s XP by ${amount}. Reason: ${reason}`, 'system')
      } catch (err) {
        console.error("Failed to log global activity about XP change", err);
      }

      showToast('XP Adjusted Successfully', 'success')
    } catch (error) {
      console.error("Error adjusting XP:", error)
      showToast('Failed to adjust XP', 'error')
    }
  }, [triggerNotification, logGlobalActivity, members, showToast])

  const resetAllProductivityScores = useCallback(async () => {
    try {
      const batch = writeBatch(db)
      const snapshot = await getDocs(collection(db, 'users'))
      snapshot.docs.forEach(docSnap => {
        batch.update(docSnap.ref, { productivityScore: 0 })
      })
      await batch.commit()
      await logGlobalActivity(`Reset the entire leaderboard for a new season`, 'system')
      showToast('Season reset successfully! All XP cleared.', 'success')
    } catch (error) { showToast('Failed to reset leaderboard', 'error') }
  }, [logGlobalActivity, showToast])

  const addProject = useCallback(async (projectData) => {
    try {
      const newProject = {
        ...projectData,
        createdAt: serverTimestamp(),
        children: [],
        isFavorite: false,
        spaceId: projectData.spaceId || (spaces.length > 0 ? spaces[0].id : 'space-1')
      }
      const docRef = await addDoc(collection(db, 'projects'), newProject)
      await logGlobalActivity(`Created project "${projectData.name}"`, 'project')
      showToast('Project created', 'success')
      return { id: docRef.id, ...newProject }
    } catch (error) { showToast('Failed to create project', 'error') }
  }, [logGlobalActivity, showToast, spaces])

  const updateProject = useCallback(async (projectId, updates) => {
    try {
      const projectRef = doc(db, 'projects', projectId)
      await updateDoc(projectRef, updates)
      if (updates.name) {
        await logGlobalActivity(`Renamed a project to "${updates.name}"`, 'project')
      }
    } catch (error) { showToast('Failed to update project', 'error') }
  }, [logGlobalActivity, showToast])

  const deleteProject = useCallback(async (projectId) => {
    try {
      const project = projects.find(p => p.id === projectId)
      await apiFetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      await logGlobalActivity(`Deleted project "${project?.name || 'Unknown'}"`, 'project')
      showToast('Project deleted', 'success')
    } catch (error) {
      showToast('Failed to delete project. Make sure you are an admin.', 'error')
    }
  }, [apiFetch, projects, logGlobalActivity, showToast])

  const toggleProjectFavorite = useCallback(async (projectId) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      await updateProject(projectId, { isFavorite: !project.isFavorite })
    }
  }, [projects, updateProject])

  const moveTask = useCallback((taskId, newStatus) => {
    updateTask(taskId, { status: newStatus })
  }, [updateTask])

  const getTasksByProject = useCallback((projectId) => {
    return tasks.filter(task => String(task.projectId) === String(projectId))
  }, [tasks])

  const getTasksByStatus = useCallback((status) => {
    return tasks.filter(task => task.status === status)
  }, [tasks])

  const getMemberById = useCallback((id) => {
    return members.find(m => m.id === id)
  }, [members])

  // NEW: Updated to modify Firestore instead of just local state
  const toggleSpaceExpanded = useCallback(async (spaceId) => {
    try {
      const space = spaces.find(s => s.id === spaceId)
      if (space) {
        await updateDoc(doc(db, 'spaces', spaceId), { isExpanded: !space.isExpanded })
      }
    } catch (error) {
      console.error("Error toggling space:", error)
    }
  }, [spaces])

  const addSpace = useCallback(async (spaceName) => {
    try {
      const newSpace = {
        name: spaceName,
        icon: 'folder',
        isExpanded: true,
        isFavorite: false,
        createdAt: serverTimestamp()
      }
      const docRef = await addDoc(collection(db, 'spaces'), newSpace)
      await logGlobalActivity(`Created space "${spaceName}"`, 'space')
      showToast('Space added', 'success')
      return { id: docRef.id, ...newSpace }
    } catch (error) {
      console.error("Error adding space: ", error)
      showToast('Failed to create space', 'error')
    }
  }, [logGlobalActivity, showToast])

  const deleteSpace = useCallback(async (spaceId) => {
    try {
      const space = spaces.find(s => s.id === spaceId)
      // Optional: Delete projects associated with the space
      // const projectsToDelete = projects.filter(p => p.spaceId === spaceId)
      // await Promise.all(projectsToDelete.map(p => apiFetch(`/api/projects/${p.id}`, { method: 'DELETE' })))

      await deleteDoc(doc(db, 'spaces', spaceId))
      await logGlobalActivity(`Deleted space "${space?.name || 'Unknown'}"`, 'space')
      showToast('Space deleted', 'success')
    } catch (error) {
      console.error("Error deleting space: ", error)
      showToast('Failed to delete space', 'error')
    }
  }, [spaces, logGlobalActivity, showToast])

  const addMember = useCallback(async (memberData) => {
    try {
      await addDoc(collection(db, 'users'), {
        ...memberData,
        createdAt: serverTimestamp(),
        status: 'offline',
        role: 'employee',
        productivityScore: 0
      })
      await logGlobalActivity(`Added member "${memberData.name}" to workspace`, 'user')
      showToast('Member added to workspace', 'success')
    } catch (error) { showToast('Failed to add member', 'error') }
  }, [logGlobalActivity, showToast])

  const updateMemberRole = useCallback(async (userId, newRole) => {
    try {
      const member = members.find(m => m.id === userId)
      await updateDoc(doc(db, 'users', userId), { role: newRole })
      await logGlobalActivity(`Changed role of ${member?.name || 'User'} to ${newRole}`, 'user')
      showToast('Member role updated', 'success')
    } catch (error) { showToast('Failed to update member role', 'error') }
  }, [members, logGlobalActivity, showToast])

  const removeMember = useCallback(async (userId) => {
    try {
      const member = members.find(m => m.id === userId)
      try {
        await apiFetch(`/api/users/${userId}`, { method: 'DELETE' })
      } catch (backendError) {
        console.warn("Backend auth deletion failed, falling back to Firestore removal:", backendError)
      }

      await deleteDoc(doc(db, 'users', userId))
      await logGlobalActivity(`Removed member "${member?.name || 'Unknown'}" from workspace`, 'user')
      showToast('Member removed from workspace', 'success')
    } catch (error) { showToast('Failed to remove member completely', 'error') }
  }, [members, apiFetch, logGlobalActivity, showToast])

  const [user, setUser] = useState({ id: 'u1', name: 'User' })

  const value = {
    tasks,
    projects,
    members,
    spaces,
    user,
    notifications,
    globalActivities,
    realtimeMessages,
    setRealtimeMessages,
    activeTask,
    isDrawerOpen,
    openTaskDrawer,
    closeTaskDrawer,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    addSubtask,
    toggleSubtask,
    editSubtask,
    deleteSubtask,
    addComment,
    sendMessage,
    markChatAsRead,
    markMessagesAsReadForUser,
    fetchChatHistory,
    getTasksByProject,
    getTasksByStatus,
    getMemberById,
    addMember,
    removeMember,
    updateMemberRole,
    addProject,
    updateProject,
    deleteProject,
    toggleProjectFavorite,
    toggleSpaceExpanded,
    addSpace,
    deleteSpace,
    addNotification: triggerNotification,
    markNotificationAsRead,
    markNotificationAsUnread,
    markAllNotificationsAsRead,
    deleteNotification,
    clearNotifications,
    adjustProductivityScore,
    resetAllProductivityScores,
    showToast,
    confirmAction,
    setUser,
    currentUser,
    apiFetch
  }

  const getToastStyles = (type) => {
    if (type === 'error') return { bg: 'bg-[#1E1F21] border-red-500/30 text-red-400', icon: <AlertCircle size={18} /> }
    if (type === 'info') return { bg: 'bg-[#1E1F21] border-blue-500/30 text-blue-400', icon: <Info size={18} /> }
    return { bg: 'bg-[#1E1F21] border-green-500/30 text-green-400', icon: <CheckCircle2 size={18} /> }
  }

  return (
    <ProjectContext.Provider value={value}>
      {children}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl border ${getToastStyles(toast.type).bg}`}>
            {getToastStyles(toast.type).icon}
            <span className="font-medium text-sm pr-4">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100 transition-opacity">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {confirmConfig && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmConfig(null)} />
          <div className="relative z-10 w-full max-w-md bg-[#1E1F21] border border-[#2B2D31] rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              {confirmConfig.type === 'danger' ? <AlertTriangle className="text-red-500" size={24} /> : <Info className="text-purple-500" size={24} />}
              <h3 className="text-lg font-bold text-white">{confirmConfig.title}</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-6">{confirmConfig.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmConfig(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-[#2B2D31] transition-colors">Cancel</button>
              <button
                onClick={() => { confirmConfig.onConfirm(); setConfirmConfig(null); }}
                className={`px-6 py-2 rounded-lg text-sm font-bold text-white transition-colors shadow-lg ${confirmConfig.type === 'danger' ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20'}`}
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