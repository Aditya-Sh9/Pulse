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
  Normal: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  Low: { color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' }
}

export default function TaskDrawer() {
  const {
    activeTask, isDrawerOpen, closeTaskDrawer, updateTask,
    addSubtask, toggleSubtask, editSubtask, deleteSubtask, deleteTask, addComment, members
  } = useProject()

  const { currentUser, userRole } = useAuth()

  const [newSubtask, setNewSubtask] = useState('')
  const [description, setDescription] = useState('')
  const [comments, setComments] = useState([])
  const [activities, setActivities] = useState([])
  const [activeTab, setActiveTab] = useState('comments') // 'comments' | 'activity'
  const [newComment, setNewComment] = useState('')
  const commentsEndRef = useRef(null)

  // Edit subtask state
  const [editingSubtaskId, setEditingSubtaskId] = useState(null)
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('')

  // Initialize fields when task opens
  useEffect(() => {
    if (activeTask) {
      setDescription(activeTask.description || '')
    }
  }, [activeTask])

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
      <div className="relative w-full max-w-4xl bg-[#0F1117] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-[#2B2D31]">

        {/* --- HEADER --- */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2B2D31] bg-[#18191B]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleUpdate('status', activeTask.status === 'COMPLETE' ? 'TO DO' : 'COMPLETE')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-bold transition-all border ${activeTask.status === 'COMPLETE'
                  ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'
                  : 'bg-[#2B2D31] text-slate-300 border-[#3E4045] hover:bg-[#3E4045]'
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
                  className={`p-2 rounded-lg transition-colors ${activeTask.isArchived ? 'text-purple-400 bg-purple-400/10 hover:bg-purple-400/20' : 'text-slate-500 hover:text-purple-400 hover:bg-purple-400/10'}`}
                  title={activeTask.isArchived ? "Unarchive Task" : "Archive Task"}
                >
                  <Archive size={18} />
                </button>
                <button
                  onClick={() => deleteTask(activeTask.id)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Delete Task"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
            <button onClick={closeTaskDrawer} className="p-2 text-slate-500 hover:text-white hover:bg-[#2B2D31] rounded-lg transition-colors">
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
                className="w-full bg-transparent text-3xl font-black text-white focus:outline-none placeholder-slate-600"
                placeholder="Task Title"
              />
            </div>

            {/* Meta Attributes Grid */}
            <div className="grid grid-cols-2 gap-4">

              {/* Assignee */}
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-slate-500 font-medium flex items-center gap-2">
                  <User size={16} /> Assignee
                </div>
                <select
                  value={activeTask.assigneeId || ''}
                  onChange={(e) => handleUpdate('assigneeId', e.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none cursor-pointer hover:bg-[#2B2D31] px-2 py-1 rounded transition-colors"
                >
                  <option value="" className="bg-[#1E1F21]">Unassigned</option>
                  {(userRole === 'admin' ? members : members.filter(m => m.id === currentUser?.uid)).map(m => (
                    <option key={m.id} value={m.id} className="bg-[#1E1F21]">{m.name || m.email}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-slate-500 font-medium flex items-center gap-2">
                  <Flag size={16} /> Priority
                </div>
                <select
                  value={activeTask.priority || 'Normal'}
                  onChange={(e) => handleUpdate('priority', e.target.value)}
                  className={`bg-transparent text-sm focus:outline-none cursor-pointer hover:bg-[#2B2D31] px-2 py-1 rounded transition-colors ${PRIORITIES[activeTask.priority || 'Normal']?.color.split(' ')[0]}`}
                >
                  <option value="High" className="bg-[#1E1F21] text-red-400">High</option>
                  <option value="Normal" className="bg-[#1E1F21] text-blue-400">Normal</option>
                  <option value="Low" className="bg-[#1E1F21] text-slate-400">Low</option>
                </select>
              </div>

              {/* Due Date */}
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-slate-500 font-medium flex items-center gap-2">
                  <Calendar size={16} /> Due Date
                </div>
                <input
                  type="date"
                  value={activeTask.dueDate || ''}
                  onChange={(e) => handleUpdate('dueDate', e.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none hover:bg-[#2B2D31] px-2 py-1 rounded transition-colors [color-scheme:dark]"
                />
              </div>

              {/* Status */}
              <div className="flex items-center gap-4">
                <div className="w-24 text-sm text-slate-500 font-medium flex items-center gap-2">
                  <Clock size={16} /> Status
                </div>
                <select
                  value={activeTask.status || 'TO DO'}
                  onChange={(e) => handleUpdate('status', e.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none cursor-pointer hover:bg-[#2B2D31] px-2 py-1 rounded transition-colors"
                >
                  <option value="TO DO" className="bg-[#1E1F21]">TO DO</option>
                  <option value="IN PROGRESS" className="bg-[#1E1F21]">IN PROGRESS</option>
                  <option value="COMPLETE" className="bg-[#1E1F21]">COMPLETE</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                <AlignLeft size={16} className="text-slate-500" /> Description
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => handleUpdate('description', description)}
                placeholder="Add more details to this task..."
                className="w-full min-h-[120px] bg-[#1E1F21] border border-[#2B2D31] rounded-xl p-4 text-sm text-white focus:outline-none focus:border-purple-500 resize-y transition-colors placeholder-slate-600"
              />
            </div>

            {/* Subtasks */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                <CheckSquare size={16} className="text-slate-500" /> Subtasks
              </div>

              <div className="space-y-2">
                {activeTask.subtasks?.map(st => (
                  <div key={st.id} className="flex items-center gap-3 group">
                    <button
                      onClick={() => toggleSubtask(activeTask.id, st.id, activeTask.subtasks)}
                      className={`flex-shrink-0 transition-colors ${st.completed ? 'text-green-500' : 'text-slate-500 hover:text-white'}`}
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
                        className="flex-1 bg-[#1E1F21] text-sm text-white px-2 py-1 rounded border border-purple-500 focus:outline-none"
                      />
                    ) : (
                      <span className={`text-sm flex-1 ${st.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                        {st.title}
                      </span>
                    )}

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingSubtaskId(st.id);
                          setEditingSubtaskTitle(st.title);
                        }}
                        className="p-1.5 text-slate-500 hover:text-purple-400 hover:bg-purple-500/10 rounded transition-colors"
                        title="Edit subtask"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteSubtask(activeTask.id, st.id, activeTask.subtasks)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
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
                <Plus size={18} className="text-slate-500 flex-shrink-0" />
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
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
                />
              </div>
            </div>

          </div>

          {/* --- RIGHT COLUMN: ACTIVITY --- */}
          <div className="w-80 bg-[#18191B] border-l border-[#2B2D31] flex flex-col">

            {/* Tabs: Comments & Activity */}
            <div className="flex items-center gap-6 px-6 pt-6 border-b border-[#2B2D31]">
              <button
                onClick={() => setActiveTab('comments')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'comments' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Comments ({comments.length})
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'activity' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                Activity
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {activeTab === 'comments' ? (
                <>
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        {comment.userAvatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-white">{comment.userName}</span>
                          <span className="text-[10px] text-slate-500">
                            {comment.createdAt ? new Date(comment.createdAt.toDate()).toLocaleString() : 'Just now'}
                          </span>
                        </div>
                        <div className="text-sm text-slate-300 bg-[#1E1F21] border border-[#2B2D31] p-3 rounded-tr-xl rounded-b-xl leading-relaxed inline-block">
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
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                        {activity.userAvatar}
                      </div>
                      <div>
                        <p className="text-slate-300">
                          <span className="font-bold text-white">{activity.userName}</span> {activity.action}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {activity.createdAt ? new Date(activity.createdAt.toDate()).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activities.length === 0 && (
                    <div className="text-center text-slate-500 text-sm py-4">No activity yet.</div>
                  )}
                </div>
              )}
            </div>

            {/* Comment Input */}
            {activeTab === 'comments' && (
              <form onSubmit={handleSendComment} className="flex items-center gap-3 p-6 pt-0">
                <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                </div>
                <div className="flex-1 relative">
                  <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="w-full bg-[#1E1F21] border border-[#2B2D31] rounded-full pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-purple-600 rounded-full text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
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