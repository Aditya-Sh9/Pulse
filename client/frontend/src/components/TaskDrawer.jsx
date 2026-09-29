import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useProject, MAX_ATTACHMENT_BYTES } from '../context/ProjectContext'
import { useAuth } from '../context/AuthContext'
import { db } from '../config/firebase'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import {
  X, CheckCircle2, Circle, Flag, Calendar, User, Repeat, Tag, Paperclip, Link2, Lock,
  AlignLeft, CheckSquare, Plus, Trash2, Clock, Send, Archive, Pencil, Bell, BellOff, Link, FileText, Download, Loader2
} from 'lucide-react'
import { toJsDate } from '../utils/dates'
import { taskUrl, copyToClipboard } from '../utils/links'
import useFocusTrap from '../hooks/useFocusTrap'
import { LabelInput, LabelChip } from './Labels'
import { RECURRENCE_OPTIONS } from '../utils/taskMeta'

const PRIORITIES = {
  High: { color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  Normal: { color: 'text-neutral-300 bg-neutral-500/10 border-neutral-500/25' },
  Low: { color: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/20' }
}

const formatBytes = (n) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)

// Title is saved on blur/Enter, not per keystroke (each save is a Firestore write + audit entry)
function TaskTitleEditor({ initialTitle, onSave }) {
  const [title, setTitle] = useState(initialTitle)

  const commit = () => {
    const next = title.trim()
    if (next && next !== initialTitle) onSave(next)
    else setTitle(initialTitle)
  }

  return (
    <input
      type="text"
      aria-label="Task title"
      value={title}
      maxLength={300}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') { e.preventDefault(); setTitle(initialTitle) }
      }}
      className="w-full bg-transparent text-2xl sm:text-3xl font-bold text-white focus:outline-none placeholder-neutral-500 rounded-md focus-visible:ring-2 focus-visible:ring-accent-500/50"
      placeholder="Task Title"
    />
  )
}

function TaskDescriptionEditor({ initialDescription, onSave }) {
  const [description, setDescription] = useState(initialDescription)

  return (
    <textarea
      aria-label="Description"
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      onBlur={() => { if (description !== initialDescription) onSave(description) }}
      placeholder="Add more details to this task..."
      className="w-full min-h-[120px] bg-card border border-raised rounded-xl p-4 text-sm text-white focus:outline-none focus:border-accent-500 resize-y transition-colors placeholder-neutral-500"
    />
  )
}

function AttachmentList({ attachments, canRemove, onRemove, compact = false }) {
  if (!attachments?.length) return null
  return (
    <ul className={`grid grid-cols-1 gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
      {attachments.map(a => {
        const isImage = a.type?.startsWith('image/')
        return (
          <li key={a.path} className="group flex items-center gap-3 p-2 rounded-lg bg-card border border-raised min-w-0">
            {isImage ? (
              <img src={a.url} alt="" loading="lazy" className="w-10 h-10 rounded-md object-cover flex-shrink-0 bg-raised" />
            ) : (
              <div className="w-10 h-10 rounded-md bg-raised flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-neutral-400" aria-hidden="true" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <a href={a.url} target="_blank" rel="noreferrer" className="block text-sm text-neutral-200 hover:text-accent-300 truncate" title={a.name}>{a.name}</a>
              <p className="text-[11px] text-neutral-400">{formatBytes(a.size || 0)}</p>
            </div>
            <a href={a.url} target="_blank" rel="noreferrer" download={a.name} aria-label={`Download ${a.name}`} className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-raised">
              <Download size={14} />
            </a>
            {canRemove(a) && (
              <button type="button" onClick={() => onRemove(a)} aria-label={`Remove ${a.name}`} className="p-1.5 rounded-md text-neutral-400 hover:text-red-400 hover:bg-red-500/10">
                <Trash2 size={14} />
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default function TaskDrawer() {
  const {
    activeTask, isDrawerOpen, closeTaskDrawer, updateTask, tasks, allLabels,
    addSubtask, toggleSubtask, editSubtask, deleteSubtask, deleteTask, setTaskArchived, addComment, members,
    toggleTaskWatch, confirmAction, showToast, addTaskAttachments, removeTaskAttachment
  } = useProject()

  const { currentUser, userRole } = useAuth()
  const panelRef = useRef(null)
  const fileInputRef = useRef(null)
  const commentFileRef = useRef(null)

  const [newSubtask, setNewSubtask] = useState('')
  const [comments, setComments] = useState([])
  const [activities, setActivities] = useState([])
  const [activeTab, setActiveTab] = useState('comments') // 'comments' | 'activity'
  const [newComment, setNewComment] = useState('')
  const [commentFiles, setCommentFiles] = useState([])
  const [sendingComment, setSendingComment] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dependencyPick, setDependencyPick] = useState('')
  const commentsEndRef = useRef(null)

  // Edit subtask state
  const [editingSubtaskId, setEditingSubtaskId] = useState(null)
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('')

  useFocusTrap(panelRef, isDrawerOpen && !!activeTask)

  // Real-time comments & activities
  useEffect(() => {
    if (!activeTask?.id) return

    const qComments = query(collection(db, 'tasks', activeTask.id, 'comments'), orderBy('createdAt', 'asc'))
    const unsubComments = onSnapshot(qComments, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
    })

    const qActivities = query(collection(db, 'tasks', activeTask.id, 'activities'), orderBy('createdAt', 'asc'))
    const unsubActivities = onSnapshot(qActivities, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    })

    return () => {
      unsubComments()
      unsubActivities()
    }
  }, [activeTask?.id])

  // Escape closes the drawer (unless an inline editor handled it first)
  useEffect(() => {
    if (!isDrawerOpen) return
    const onKey = (e) => { if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('[role="alertdialog"]')) closeTaskDrawer() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isDrawerOpen, closeTaskDrawer])

  // Candidates for "blocked by": other open tasks in the same project
  const dependencyOptions = useMemo(() => {
    if (!activeTask) return []
    return tasks.filter(t => t.projectId === activeTask.projectId && t.id !== activeTask.id && !t.isArchived && !(activeTask.blockedBy || []).includes(t.id))
  }, [tasks, activeTask])

  if (!isDrawerOpen || !activeTask) return null

  const watching = (activeTask.watchers || []).includes(currentUser?.uid)
  // Employees may only (un)assign themselves, but still see who currently owns the task
  const assigneeOptions = userRole === 'admin'
    ? members
    : members.filter(m => m.id === currentUser?.uid || m.id === activeTask.assigneeId)
  const blockers = (activeTask.blockedBy || []).map(id => tasks.find(t => t.id === id) || { id, title: 'Deleted task', status: 'COMPLETE', missing: true })
  const openBlockers = blockers.filter(b => b.status !== 'COMPLETE')

  const formatStamp = (value) => toJsDate(value)?.toLocaleString() || 'Just now'

  const handleUpdate = (field, value) => updateTask(activeTask.id, { [field]: value })

  const pickFiles = (fileList) => {
    const files = [...fileList]
    const tooBig = files.filter(f => f.size > MAX_ATTACHMENT_BYTES)
    if (tooBig.length) showToast(`${tooBig.map(f => f.name).join(', ')} ${tooBig.length === 1 ? 'is' : 'are'} over 10 MB`, 'error')
    return files.filter(f => f.size <= MAX_ATTACHMENT_BYTES)
  }

  const handleAttach = async (e) => {
    const files = pickFiles(e.target.files)
    e.target.value = ''
    if (!files.length) return
    setUploading(true)
    await addTaskAttachments(activeTask.id, files)
    setUploading(false)
  }

  const handleSendComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() && commentFiles.length === 0) return
    setSendingComment(true)
    const ok = await addComment(activeTask.id, newComment, commentFiles)
    setSendingComment(false)
    if (ok) {
      setNewComment('')
      setCommentFiles([])
    }
  }

  const handleEditSubtaskSubmit = (subtaskId) => {
    if (editingSubtaskTitle.trim() !== '') {
      editSubtask(activeTask.id, subtaskId, editingSubtaskTitle.trim(), activeTask.subtasks)
    }
    setEditingSubtaskId(null)
  }

  const doneSubtasks = (activeTask.subtasks || []).filter(s => s.completed).length
  const selectCls = 'bg-transparent text-sm text-white focus:outline-none cursor-pointer hover:bg-raised px-2 py-1.5 rounded transition-colors min-w-0 max-w-full'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={closeTaskDrawer} aria-hidden="true" />

      {/* Drawer */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Task: ${activeTask.title}`}
        tabIndex={-1}
        className="relative w-full max-w-5xl bg-base h-full shadow-2xl flex flex-col animate-in slide-in-from-right-full duration-300 border-l border-raised focus:outline-none"
      >

        {/* --- HEADER --- */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-raised bg-panel">
          <button
            onClick={() => handleUpdate('status', activeTask.status === 'COMPLETE' ? 'TO DO' : 'COMPLETE')}
            disabled={activeTask.status !== 'COMPLETE' && openBlockers.length > 0}
            title={openBlockers.length > 0 && activeTask.status !== 'COMPLETE' ? 'Finish the tasks this depends on first' : undefined}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${activeTask.status === 'COMPLETE'
              ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
              : 'bg-raised text-neutral-200 border-edge hover:bg-edge'
              }`}
          >
            {activeTask.status === 'COMPLETE' ? <CheckCircle2 size={16} aria-hidden="true" /> : openBlockers.length ? <Lock size={16} aria-hidden="true" /> : <Circle size={16} aria-hidden="true" />}
            {activeTask.status === 'COMPLETE' ? 'Completed' : openBlockers.length ? 'Blocked' : 'Mark Complete'}
          </button>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={async () => {
                const ok = await copyToClipboard(taskUrl(activeTask))
                showToast(ok ? 'Task link copied' : 'Could not access the clipboard', ok ? 'success' : 'error')
              }}
              className="p-2 text-neutral-400 hover:text-white hover:bg-raised rounded-lg transition-colors"
              title="Copy link to task"
              aria-label="Copy link to task"
            >
              <Link size={18} />
            </button>
            <button
              onClick={() => toggleTaskWatch(activeTask)}
              className={`p-2 rounded-lg transition-colors ${watching ? 'text-accent-400 bg-accent-400/10 hover:bg-accent-400/20' : 'text-neutral-400 hover:text-white hover:bg-raised'}`}
              title={watching ? 'Cancel due-date reminder' : 'Remind me the day before it’s due'}
              aria-label={watching ? 'Cancel due-date reminder' : 'Remind me the day before it’s due'}
              aria-pressed={watching}
            >
              {watching ? <BellOff size={18} /> : <Bell size={18} />}
            </button>
            {userRole === 'admin' && (
              <>
                <button
                  onClick={() => { setTaskArchived(activeTask, !activeTask.isArchived); if (!activeTask.isArchived) closeTaskDrawer() }}
                  className={`p-2 rounded-lg transition-colors ${activeTask.isArchived ? 'text-accent-400 bg-accent-400/10 hover:bg-accent-400/20' : 'text-neutral-400 hover:text-accent-400 hover:bg-accent-400/10'}`}
                  title={activeTask.isArchived ? 'Unarchive Task' : 'Archive Task'}
                  aria-label={activeTask.isArchived ? 'Unarchive task' : 'Archive task'}
                >
                  <Archive size={18} />
                </button>
                <button
                  onClick={() => confirmAction('Delete task', `Delete "${activeTask.title}"? You'll have a few seconds to undo.`, () => deleteTask(activeTask.id))}
                  className="p-2 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Delete Task"
                  aria-label="Delete task"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
            <div className="w-px h-6 bg-edge mx-1" aria-hidden="true" />
            <button onClick={closeTaskDrawer} aria-label="Close task" className="p-2 text-neutral-400 hover:text-white hover:bg-raised rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">
          {/* --- LEFT COLUMN: DETAILS --- */}
          <div className="flex-1 lg:overflow-y-auto p-4 sm:p-8 space-y-8 min-w-0">

            <div className="space-y-3">
              <TaskTitleEditor
                key={`${activeTask.id}:${activeTask.title}`}
                initialTitle={activeTask.title || ''}
                onSave={(nextTitle) => handleUpdate('title', nextTitle)}
              />
              {(activeTask.labels?.length > 0 || activeTask.recurrence) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeTask.recurrence && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-raised text-neutral-300 ring-1 ring-inset ring-edge">
                      <Repeat size={11} aria-hidden="true" /> Repeats {activeTask.recurrence}
                    </span>
                  )}
                  {(activeTask.labels || []).map(l => <LabelChip key={l} label={l} />)}
                </div>
              )}
            </div>

            {/* Meta Attributes Grid */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <div className="flex items-center gap-3 min-w-0">
                <dt className="w-28 flex-shrink-0 text-sm text-neutral-400 font-medium flex items-center gap-2">
                  <User size={16} aria-hidden="true" /> <label htmlFor="drawer-assignee">Assignee</label>
                </dt>
                <dd className="min-w-0">
                  <select id="drawer-assignee" value={activeTask.assigneeId || ''} onChange={(e) => handleUpdate('assigneeId', e.target.value)} className={selectCls}>
                    <option value="" className="bg-card">Unassigned</option>
                    {assigneeOptions.map(m => (
                      <option key={m.id} value={m.id} className="bg-card">{m.name || m.email}</option>
                    ))}
                  </select>
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <dt className="w-28 flex-shrink-0 text-sm text-neutral-400 font-medium flex items-center gap-2">
                  <Flag size={16} aria-hidden="true" /> <label htmlFor="drawer-priority">Priority</label>
                </dt>
                <dd>
                  <select
                    id="drawer-priority"
                    value={activeTask.priority || 'Normal'}
                    onChange={(e) => handleUpdate('priority', e.target.value)}
                    className={`${selectCls} ${PRIORITIES[activeTask.priority || 'Normal']?.color.split(' ')[0]}`}
                  >
                    <option value="High" className="bg-card text-red-400">High</option>
                    <option value="Normal" className="bg-card text-neutral-300">Normal</option>
                    <option value="Low" className="bg-card text-neutral-400">Low</option>
                  </select>
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <dt className="w-28 flex-shrink-0 text-sm text-neutral-400 font-medium flex items-center gap-2">
                  <Calendar size={16} aria-hidden="true" /> <label htmlFor="drawer-due">Due date</label>
                </dt>
                <dd>
                  <input
                    id="drawer-due"
                    type="date"
                    value={activeTask.dueDate || ''}
                    onChange={(e) => handleUpdate('dueDate', e.target.value)}
                    className="bg-transparent text-sm text-white focus:outline-none hover:bg-raised px-2 py-1.5 rounded transition-colors [color-scheme:dark]"
                  />
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <dt className="w-28 flex-shrink-0 text-sm text-neutral-400 font-medium flex items-center gap-2">
                  <Clock size={16} aria-hidden="true" /> <label htmlFor="drawer-status">Status</label>
                </dt>
                <dd>
                  <select id="drawer-status" value={activeTask.status || 'TO DO'} onChange={(e) => handleUpdate('status', e.target.value)} className={selectCls}>
                    <option value="TO DO" className="bg-card">TO DO</option>
                    <option value="IN PROGRESS" className="bg-card">IN PROGRESS</option>
                    <option value="COMPLETE" className="bg-card">COMPLETE</option>
                  </select>
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <dt className="w-28 flex-shrink-0 text-sm text-neutral-400 font-medium flex items-center gap-2">
                  <Repeat size={16} aria-hidden="true" /> <label htmlFor="drawer-recurrence">Repeat</label>
                </dt>
                <dd>
                  <select id="drawer-recurrence" value={activeTask.recurrence || ''} onChange={(e) => handleUpdate('recurrence', e.target.value)} className={selectCls}>
                    {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-card">{o.label}</option>)}
                  </select>
                </dd>
              </div>
            </dl>

            {/* Labels */}
            <section className="space-y-3" aria-labelledby="drawer-labels-heading">
              <h3 id="drawer-labels-heading" className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                <Tag size={16} className="text-neutral-400" aria-hidden="true" /> Labels
              </h3>
              <LabelInput
                key={activeTask.id}
                value={activeTask.labels || []}
                onChange={(labels) => handleUpdate('labels', labels)}
                suggestions={allLabels}
              />
            </section>

            {/* Description */}
            <section className="space-y-3" aria-labelledby="drawer-desc-heading">
              <h3 id="drawer-desc-heading" className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                <AlignLeft size={16} className="text-neutral-400" aria-hidden="true" /> Description
              </h3>
              <TaskDescriptionEditor
                key={activeTask.id}
                initialDescription={activeTask.description || ''}
                onSave={(nextDescription) => handleUpdate('description', nextDescription)}
              />
            </section>

            {/* Dependencies */}
            <section className="space-y-3" aria-labelledby="drawer-deps-heading">
              <h3 id="drawer-deps-heading" className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                <Link2 size={16} className="text-neutral-400" aria-hidden="true" /> Blocked by
                {openBlockers.length > 0 && <span className="text-xs font-medium text-amber-400">({openBlockers.length} open)</span>}
              </h3>
              {blockers.length > 0 && (
                <ul className="space-y-1.5">
                  {blockers.map(b => (
                    <li key={b.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-raised text-sm">
                      {b.status === 'COMPLETE'
                        ? <CheckCircle2 size={15} className="text-green-400 flex-shrink-0" aria-label="Done" />
                        : <Lock size={15} className="text-amber-400 flex-shrink-0" aria-label="Open" />}
                      <span className={`flex-1 truncate ${b.status === 'COMPLETE' ? 'text-neutral-400 line-through' : 'text-neutral-200'}`}>{b.title}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdate('blockedBy', (activeTask.blockedBy || []).filter(id => id !== b.id))}
                        aria-label={`Remove dependency on ${b.title}`}
                        className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {dependencyOptions.length > 0 && (activeTask.blockedBy || []).length < 20 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="drawer-dependency" className="sr-only">Add a task this depends on</label>
                  <select
                    id="drawer-dependency"
                    value={dependencyPick}
                    onChange={(e) => setDependencyPick(e.target.value)}
                    className="flex-1 min-w-0 bg-card border border-raised rounded-lg px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-accent-500"
                  >
                    <option value="">Choose a task in this project…</option>
                    {dependencyOptions.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                  <button
                    type="button"
                    disabled={!dependencyPick}
                    onClick={() => { handleUpdate('blockedBy', [...(activeTask.blockedBy || []), dependencyPick]); setDependencyPick('') }}
                    className="px-3 py-2 rounded-lg bg-raised text-sm font-medium text-neutral-200 hover:bg-edge disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              )}
              {blockers.length === 0 && <p className="text-xs text-neutral-400">This task can’t be completed until every task listed here is done.</p>}
            </section>

            {/* Subtasks */}
            <section className="space-y-4" aria-labelledby="drawer-subtasks-heading">
              <h3 id="drawer-subtasks-heading" className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                <CheckSquare size={16} className="text-neutral-400" aria-hidden="true" /> Subtasks
                {activeTask.subtasks?.length > 0 && <span className="text-xs text-neutral-400 tabular-nums">{doneSubtasks}/{activeTask.subtasks.length}</span>}
              </h3>
              {activeTask.subtasks?.length > 0 && (
                <div className="h-1.5 rounded-full bg-raised overflow-hidden" role="progressbar" aria-valuenow={doneSubtasks} aria-valuemin={0} aria-valuemax={activeTask.subtasks.length} aria-label="Subtask progress">
                  <div className="h-full bg-accent-500 transition-[width] duration-300" style={{ width: `${(doneSubtasks / activeTask.subtasks.length) * 100}%` }} />
                </div>
              )}

              <ul className="space-y-1">
                {activeTask.subtasks?.map(st => (
                  <li key={st.id} className="flex items-center gap-3 group rounded-md px-1 py-1 hover:bg-card">
                    <button
                      onClick={() => toggleSubtask(activeTask.id, st.id, activeTask.subtasks)}
                      aria-label={st.completed ? `Mark "${st.title}" not done` : `Mark "${st.title}" done`}
                      className={`flex-shrink-0 p-0.5 transition-colors ${st.completed ? 'text-green-400' : 'text-neutral-400 hover:text-white'}`}
                    >
                      {st.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>

                    {editingSubtaskId === st.id ? (
                      <input
                        autoFocus
                        aria-label="Edit subtask"
                        value={editingSubtaskTitle}
                        onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                        onBlur={() => handleEditSubtaskSubmit(st.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSubtaskSubmit(st.id)
                          if (e.key === 'Escape') { e.preventDefault(); setEditingSubtaskId(null) }
                        }}
                        className="flex-1 bg-card text-sm text-white px-2 py-1 rounded border border-accent-500 focus:outline-none"
                      />
                    ) : (
                      <span className={`text-sm flex-1 break-words ${st.completed ? 'text-neutral-400 line-through' : 'text-neutral-200'}`}>
                        {st.title}
                      </span>
                    )}

                    <div className="opacity-60 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingSubtaskId(st.id); setEditingSubtaskTitle(st.title) }}
                        className="p-1.5 text-neutral-400 hover:text-accent-400 hover:bg-accent-500/10 rounded transition-colors"
                        aria-label={`Edit subtask ${st.title}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteSubtask(activeTask.id, st.id, activeTask.subtasks)}
                        className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        aria-label={`Delete subtask ${st.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex items-center gap-3 px-1">
                <Plus size={18} className="text-neutral-400 flex-shrink-0" aria-hidden="true" />
                <input
                  value={newSubtask}
                  aria-label="Add a subtask"
                  onChange={(e) => setNewSubtask(e.target.value)}
                  maxLength={200}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newSubtask.trim()) {
                      addSubtask(activeTask.id, newSubtask.trim())
                      setNewSubtask('')
                    }
                  }}
                  placeholder="Add a subtask and press Enter…"
                  className="flex-1 bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none py-1"
                />
              </div>
            </section>

            {/* Attachments */}
            <section className="space-y-3" aria-labelledby="drawer-files-heading">
              <div className="flex items-center justify-between">
                <h3 id="drawer-files-heading" className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                  <Paperclip size={16} className="text-neutral-400" aria-hidden="true" /> Attachments
                  {activeTask.attachments?.length > 0 && <span className="text-xs text-neutral-400">{activeTask.attachments.length}</span>}
                </h3>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-raised text-neutral-200 hover:bg-edge disabled:opacity-60"
                >
                  {uploading ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
                  {uploading ? 'Uploading…' : 'Add files'}
                </button>
                <input ref={fileInputRef} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={handleAttach} />
              </div>
              <AttachmentList
                attachments={activeTask.attachments}
                canRemove={(a) => a.uploadedBy === currentUser?.uid || userRole === 'admin'}
                onRemove={(a) => removeTaskAttachment(activeTask, a)}
              />
              {!activeTask.attachments?.length && <p className="text-xs text-neutral-400">Files up to 10 MB. Images show a preview.</p>}
            </section>
          </div>

          {/* --- RIGHT COLUMN: ACTIVITY --- */}
          <div className="w-full lg:w-96 bg-panel border-t lg:border-t-0 lg:border-l border-raised flex flex-col lg:min-h-0">
            <div role="tablist" aria-label="Task discussion" className="flex items-center gap-6 px-6 pt-5 border-b border-raised">
              {[['comments', `Comments (${comments.length})`], ['activity', 'Activity']].map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  id={`tab-${id}`}
                  aria-selected={activeTab === id}
                  aria-controls={`panel-${id}`}
                  onClick={() => setActiveTab(id)}
                  className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === id ? 'border-accent-500 text-accent-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="flex-1 lg:overflow-y-auto p-6 space-y-6 min-h-[200px]">
              {activeTab === 'comments' ? (
                <>
                  {comments.length === 0 && <p className="text-center text-neutral-400 text-sm py-4">No comments yet. Start the conversation below.</p>}
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0" aria-hidden="true">
                        {comment.userAvatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-bold text-white">{comment.userName}</span>
                          <span className="text-[11px] text-neutral-400">{formatStamp(comment.createdAt)}</span>
                        </div>
                        {comment.text?.trim() && (
                          <div className="text-sm text-neutral-200 bg-card border border-raised p-3 rounded-tr-xl rounded-b-xl leading-relaxed inline-block whitespace-pre-wrap break-words max-w-full">
                            {comment.text}
                          </div>
                        )}
                        {comment.attachments?.length > 0 && (
                          <div className="mt-2">
                            <AttachmentList compact attachments={comment.attachments} canRemove={() => false} onRemove={() => {}} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </>
              ) : (
                <ol className="space-y-4">
                  {activities.map(activity => (
                    <li key={activity.id} className="flex gap-3 text-sm">
                      <div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5" aria-hidden="true">
                        {activity.userAvatar}
                      </div>
                      <div>
                        <p className="text-neutral-300">
                          <span className="font-bold text-white">{activity.userName}</span> {activity.action}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{formatStamp(activity.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                  {activities.length === 0 && <li className="text-center text-neutral-400 text-sm py-4">No activity yet.</li>}
                </ol>
              )}
            </div>

            {/* Comment Input */}
            {activeTab === 'comments' && (
              <form onSubmit={handleSendComment} className="p-4 sm:p-6 pt-0 space-y-2">
                {commentFiles.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {commentFiles.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-xs text-neutral-200 max-w-full">
                        <Paperclip size={11} aria-hidden="true" /> <span className="truncate max-w-[10rem]">{f.name}</span>
                        <button type="button" onClick={() => setCommentFiles(commentFiles.filter((_, j) => j !== i))} aria-label={`Remove ${f.name}`} className="p-0.5 rounded-full hover:bg-edge">
                          <X size={11} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => commentFileRef.current?.click()}
                    aria-label="Attach files to comment"
                    className="p-2 rounded-full text-neutral-400 hover:text-white hover:bg-raised flex-shrink-0"
                  >
                    <Paperclip size={16} />
                  </button>
                  <input
                    ref={commentFileRef}
                    type="file"
                    multiple
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={(e) => { setCommentFiles([...commentFiles, ...pickFiles(e.target.files)].slice(0, 5)); e.target.value = '' }}
                  />
                  <div className="flex-1 relative">
                    <input
                      value={newComment}
                      maxLength={2000}
                      aria-label="Write a comment"
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment… use @name to mention"
                      className="w-full bg-card border border-raised rounded-full pl-4 pr-11 py-2.5 text-sm text-white focus:outline-none focus:border-accent-500 transition-colors placeholder-neutral-500"
                    />
                    <button
                      type="submit"
                      disabled={(!newComment.trim() && commentFiles.length === 0) || sendingComment}
                      aria-label="Send comment"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 bg-accent-600 rounded-full text-white hover:bg-accent-500 disabled:opacity-50 transition-colors"
                    >
                      {sendingComment ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
