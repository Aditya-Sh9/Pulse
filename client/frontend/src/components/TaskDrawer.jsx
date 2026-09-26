import React, { useState, useEffect, useRef } from 'react'
import { useProject } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import { db } from '../config/firebase'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import {
  X, CheckCircle2, Circle, Flag, Calendar, User,
  AlignLeft, CheckSquare, Plus, Trash2, Clock, MessageSquare, Send, Archive, Pencil
} from 'lucide-react'

const PRIORITIES = {
  High: { color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  Normal: { color: 'text-neutral-300 bg-neutral-500/10 border-neutral-500/25' },
  Low: { color: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20' }
}

function TaskDescriptionEditor({ initialDescription, onSave }) {
  const [description, setDescription] = useState(initialDescription)

  return (
    <textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      onBlur={() => onSave(description)}
      placeholder="Add more details to this task..."
      className="w-full min-h-[120px] bg-card border border-raised rounded-xl p-4 text-sm text-white focus:outline-none focus:border-accent-500 resize-y transition-colors placeholder-neutral-600"
    />
  )
}

export default function TaskDrawer() {
  const {
    activeTask, isDrawerOpen, closeTaskDrawer, updateTask,
    addSubtask, toggleSubtask, editSubtask, deleteSubtask, deleteTask, addComment, members
  } = useProject()

  const { currentUser, userRole } = useAuth()

  const [newSubtask, setNewSubtask] = useState('')
  const [comments, setComments] = useState([])
  const [activities, setActivities] = useState([])
  const [activeTab, setActiveTab] = useState('comments') // 'comments' | 'activity'
  const [newComment, setNewComment] = useState('')
  const commentsEndRef = useRef(null)

  // Edit subtask state
  const [editingSubtaskId, setEditingSubtaskId] = useState(null)
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('')

  // Real-time comments & activities
  useEffect(() => {
    if (!activeTask?.id) return

    const qComments = query(
      collection(db, 'tasks', activeTask.id, 'comments'),
      orderBy('createdAt', 'asc')
    )

    const unsubComments = onSnapshot(qComments, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    })

    const qActivities = query(
      collection(db, 'tasks', activeTask.id, 'activities'),
      orderBy('createdAt', 'asc')
    )
    const unsubActivities = onSnapshot(qActivities, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })

    return () => {
      unsubComments()
      unsubActivities()
    }
  }, [activeTask?.id])

  if (!isDrawerOpen || !activeTask) return null

  const handleUpdate = (field, value) => {
    updateTask(activeTask.id, { [field]: value })
  }

  const handleSendComment = (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    addComment(activeTask.id, newComment.trim())
    setNewComment('')
  }

  const handleEditSubtaskSubmit = (subtaskId) => {
    if (editingSubtaskTitle.trim() !== '') {
      editSubtask(activeTask.id, subtaskId, editingSubtaskTitle.trim(), activeTask.subtasks)
    }
    setEditingSubtaskId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={closeTaskDrawer}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-4xl bg-base h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-raised">

        {/* --- HEADER --- */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-raised bg-panel">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleUpdate('status', activeTask.status === 'COMPLETE' ? 'TO DO' : 'COMPLETE')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all border ${activeTask.status === 'COMPLETE'
                  ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
                  : 'bg-raised text-neutral-300 border-edge hover:bg-edge'
                }`}
            >
              {activeTask.status === 'COMPLETE' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              {activeTask.status === 'COMPLETE' ? 'Completed' : 'Mark Complete'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {userRole === 'admin' && (
              <>
                <button
                  onClick={() => handleUpdate('isArchived', !activeTask.isArchived)}
                  className={`p-2 rounded-lg transition-colors ${activeTask.isArchived ? 'text-accent-400 bg-accent-400/10 hover:bg-accent-400/20' : 'text-neutral-500 hover:text-accent-400 hover:bg-accent-400/10'}`}
                  title={activeTask.isArchived ? "Unarchive Task" : "Archive Task"}
                >
                  <Archive size={18} />
                </button>
                <button
                  onClick={() => deleteTask(activeTask.id)}
                  className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Delete Task"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
            <button onClick={closeTaskDrawer} className="p-2 text-neutral-500 hover:text-white hover:bg-raised rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* --- LEFT COLUMN: DETAILS --- */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8">

            {/* Title */}
            <div>
              <input
                type="text"
                value={activeTask.title || ''}
                onChange={(e) => updateTask(activeTask.id, { title: e.target.value })}
                className="w-full bg-transparent text-3xl font-bold text-white focus:outline-none placeholder-neutral-600"
                placeholder="Task Title"
              />
            </div>

            {/* Meta Attributes Grid */}
            <div className="grid grid-cols-2 gap-4">

              {/* Assignee */}
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-neutral-500 font-medium flex items-center gap-2">
                  <User size={16} /> Assignee
                </div>
                <select
                  value={activeTask.assigneeId || ''}
                  onChange={(e) => handleUpdate('assigneeId', e.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none cursor-pointer hover:bg-raised px-2 py-1 rounded transition-colors"
                >
                  <option value="" className="bg-card">Unassigned</option>
                  {(userRole === 'admin' ? members : members.filter(m => m.id === currentUser?.uid)).map(m => (
                    <option key={m.id} value={m.id} className="bg-card">{m.name || m.email}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-neutral-500 font-medium flex items-center gap-2">
                  <Flag size={16} /> Priority
                </div>
                <select
                  value={activeTask.priority || 'Normal'}
                  onChange={(e) => handleUpdate('priority', e.target.value)}
                  className={`bg-transparent text-sm focus:outline-none cursor-pointer hover:bg-raised px-2 py-1 rounded transition-colors ${PRIORITIES[activeTask.priority || 'Normal']?.color.split(' ')[0]}`}
                >
                  <option value="High" className="bg-card text-red-400">High</option>
                  <option value="Normal" className="bg-card text-neutral-300">Normal</option>
                  <option value="Low" className="bg-card text-neutral-400">Low</option>
                </select>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-neutral-500 font-medium flex items-center gap-2">
                  <Calendar size={16} /> Due Date
                </div>
                <input
                  type="date"
                  value={activeTask.dueDate || ''}
                  onChange={(e) => handleUpdate('dueDate', e.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none hover:bg-raised px-2 py-1 rounded transition-colors [color-scheme:dark]"
                />
              </div>

              {/* Status */}
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-neutral-500 font-medium flex items-center gap-2">
                  <Clock size={16} /> Status
                </div>
                <select
                  value={activeTask.status || 'TO DO'}
                  onChange={(e) => handleUpdate('status', e.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none cursor-pointer hover:bg-raised px-2 py-1 rounded transition-colors"
                >
                  <option value="TO DO" className="bg-card">TO DO</option>
                  <option value="IN PROGRESS" className="bg-card">IN PROGRESS</option>
                  <option value="COMPLETE" className="bg-card">COMPLETE</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                <AlignLeft size={16} className="text-neutral-500" /> Description
              </div>
              <TaskDescriptionEditor
                key={activeTask.id}
                initialDescription={activeTask.description || ''}
                onSave={(nextDescription) => handleUpdate('description', nextDescription)}
              />
            </div>

            {/* Subtasks */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                <CheckSquare size={16} className="text-neutral-500" /> Subtasks
              </div>

              <div className="space-y-2">
                {activeTask.subtasks?.map(st => (
                  <div key={st.id} className="flex items-center gap-3 group">
                    <button
                      onClick={() => toggleSubtask(activeTask.id, st.id, activeTask.subtasks)}
                      className={`flex-shrink-0 transition-colors ${st.completed ? 'text-green-500' : 'text-neutral-500 hover:text-white'}`}
                    >
                      {st.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>

                    {editingSubtaskId === st.id ? (
                      <input
                        autoFocus
                        value={editingSubtaskTitle}
                        onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                        onBlur={() => handleEditSubtaskSubmit(st.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSubtaskSubmit(st.id)
                          if (e.key === 'Escape') setEditingSubtaskId(null)
                        }}
                        className="flex-1 bg-card text-sm text-white px-2 py-1 rounded border border-accent-500 focus:outline-none"
                      />
                    ) : (
                      <span className={`text-sm flex-1 ${st.completed ? 'text-neutral-500 line-through' : 'text-neutral-300'}`}>
                        {st.title}
                      </span>
                    )}

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingSubtaskId(st.id);
                          setEditingSubtaskTitle(st.title);
                        }}
                        className="p-1.5 text-neutral-500 hover:text-accent-400 hover:bg-accent-500/10 rounded transition-colors"
                        title="Edit subtask"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteSubtask(activeTask.id, st.id, activeTask.subtasks)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete subtask"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Subtask Input */}
              <div className="flex items-center gap-3">
                <Plus size={18} className="text-neutral-500 flex-shrink-0" />
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSubtask.trim()) {
                      addSubtask(activeTask.id, newSubtask.trim())
                      setNewSubtask('')
                    }
                  }}
                  placeholder="Add a subtask..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none"
                />
              </div>
            </div>

          </div>

          {/* --- RIGHT COLUMN: ACTIVITY --- */}
          <div className="w-80 bg-panel border-l border-raised flex flex-col">

            {/* Tabs: Comments & Activity */}
            <div className="flex items-center gap-6 px-6 pt-6 border-b border-raised">
              <button
                onClick={() => setActiveTab('comments')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'comments' ? 'border-accent-500 text-accent-400' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
              >
                Comments ({comments.length})
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'activity' ? 'border-accent-500 text-accent-400' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
              >
                Activity
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'comments' ? (
                <>
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {comment.userAvatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white">{comment.userName}</span>
                          <span className="text-[10px] text-neutral-500">
                            {comment.createdAt ? new Date(comment.createdAt.toDate()).toLocaleString() : 'Just now'}
                          </span>
                        </div>
                        <div className="text-sm text-neutral-300 bg-card border border-raised p-3 rounded-tr-xl rounded-b-xl leading-relaxed inline-block">
                          {comment.text}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </>
              ) : (
                <div className="space-y-4">
                  {activities.map(activity => (
                    <div key={activity.id} className="flex gap-3 text-sm">
                      <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                        {activity.userAvatar}
                      </div>
                      <div>
                        <p className="text-neutral-300">
                          <span className="font-bold text-white">{activity.userName}</span> {activity.action}
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          {activity.createdAt ? new Date(activity.createdAt.toDate()).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <div className="text-center text-neutral-500 text-sm py-4">No activity yet.</div>
                  )}
                </div>
              )}
            </div>

            {/* Comment Input */}
            {activeTab === 'comments' && (
              <form onSubmit={handleSendComment} className="flex items-center gap-3 p-6 pt-0">
                <div className="w-8 h-8 rounded-full bg-accent-500/15 ring-1 ring-inset ring-accent-400/25 flex items-center justify-center text-xs font-bold text-accent-200">
                  {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                </div>
                <div className="flex-1 relative">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full bg-card border border-raised rounded-full pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-accent-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-accent-600 rounded-full text-white hover:bg-accent-500 disabled:opacity-50 transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
