import React, { useState, useCallback } from 'react';
import { X, UserCircle, ChevronDown, Calendar, Plus, Repeat } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import Modal from './Modal';
import { LabelInput } from './Labels';
import { RECURRENCE_OPTIONS } from '../utils/taskMeta';

const PRIORITY_OPTIONS = ['Low', 'Normal', 'High'];

const PRIORITY_ACTIVE = {
    Low: 'border-neutral-500 bg-neutral-800 text-neutral-100 shadow-sm',
    Normal: 'border-yellow-600 bg-yellow-900/30 text-yellow-400 shadow-sm',
    High: 'border-red-700/60 bg-red-900/25 text-red-300 shadow-sm',
};

const fieldCls = 'w-full bg-base border border-edge text-neutral-200 rounded-lg text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all placeholder-neutral-500';

// Modal for creating a task. Escape closes it; Ctrl/Cmd+Enter submits from any field.
export default function CreateTaskForm({ onCreate, onCancel, defaultStatus, defaultDueDate = '' }) {
    const { currentUser, userRole } = useAuth();
    const { members, allLabels } = useProject();
    const [form, setForm] = useState({ title: '', description: '', assigneeId: '', priority: 'Normal', dueDate: defaultDueDate, labels: [], recurrence: '' });
    const [showTitleError, setShowTitleError] = useState(false);
    const set = (patch) => setForm(prev => ({ ...prev, ...patch }));
    const close = useCallback(() => onCancel(), [onCancel]);

    // Employees can only assign to themselves (enforced by Firestore rules as well)
    const assignable = userRole === 'admin' ? members : members.filter(m => m.id === currentUser?.uid);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            setShowTitleError(true);
            document.getElementById('task-title')?.focus();
            return;
        }
        onCreate({ ...form, title: form.title.trim() });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e);
    };

    return (
        <Modal
            as="form"
            onClose={close}
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            labelledBy="create-task-title"
            noValidate
            className="max-w-2xl bg-card border border-edge rounded-xl shadow-2xl flex flex-col"
        >
            {/* Header */}
            <div className="px-6 py-5 border-b border-raised flex justify-between items-start bg-card sticky top-0 z-10">
                <div>
                    <h3 id="create-task-title" className="text-xl font-bold text-white mb-1">New task{defaultStatus && defaultStatus !== 'TO DO' ? ` · ${defaultStatus}` : ''}</h3>
                    <p className="text-sm text-neutral-400">Only the title is required. Everything else can be added later.</p>
                </div>
                <button type="button" onClick={close} aria-label="Close" className="p-1.5 rounded-md text-neutral-400 hover:bg-raised hover:text-neutral-200 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex flex-col gap-5 p-6">
                {/* Title */}
                <div className="space-y-2">
                    <label htmlFor="task-title" className="text-sm font-semibold text-neutral-300 flex">
                        Title <span className="text-red-400 ml-1" aria-hidden="true">*</span>
                    </label>
                    <input
                        id="task-title"
                        value={form.title}
                        maxLength={300}
                        required
                        aria-invalid={showTitleError && !form.title.trim()}
                        aria-describedby={showTitleError && !form.title.trim() ? 'task-title-error' : undefined}
                        onChange={(e) => set({ title: e.target.value })}
                        placeholder="e.g. Redesign homepage navigation"
                        className={`${fieldCls} px-4 py-3 ${showTitleError && !form.title.trim() ? 'border-red-500/70' : ''}`}
                        autoFocus
                    />
                    {showTitleError && !form.title.trim() && (
                        <p id="task-title-error" role="alert" className="text-xs text-red-400">Give the task a title so teammates know what it is.</p>
                    )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label htmlFor="task-description" className="text-sm font-semibold text-neutral-300">Description</label>
                    <textarea
                        id="task-description"
                        value={form.description}
                        onChange={(e) => set({ description: e.target.value })}
                        placeholder="Add details, context, or acceptance criteria..."
                        className={`${fieldCls} px-4 py-3 min-h-[100px] resize-y`}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                    {/* Assignee */}
                    <div className="space-y-2">
                        <label htmlFor="task-assignee" className="text-sm font-semibold text-neutral-300">Assignee</label>
                        <div className="relative">
                            <UserCircle size={18} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
                            <select
                                id="task-assignee"
                                value={form.assigneeId}
                                onChange={(e) => set({ assigneeId: e.target.value })}
                                className={`${fieldCls} appearance-none pl-10 pr-10 py-3 cursor-pointer`}
                            >
                                <option value="">Unassigned</option>
                                {assignable.map(m => (
                                    <option key={m.id} value={m.id}>{m.name || m.email}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
                        </div>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                        <label htmlFor="task-due" className="text-sm font-semibold text-neutral-300">Due date</label>
                        <div className="relative">
                            <Calendar size={18} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
                            <input
                                id="task-due"
                                type="date"
                                value={form.dueDate}
                                onChange={(e) => set({ dueDate: e.target.value })}
                                className={`${fieldCls} py-3 pr-4 pl-10 [color-scheme:dark] cursor-pointer`}
                            />
                        </div>
                    </div>

                    {/* Labels */}
                    <div className="space-y-2">
                        <label htmlFor="task-labels" className="text-sm font-semibold text-neutral-300">Labels</label>
                        <LabelInput id="task-labels" value={form.labels} onChange={(labels) => set({ labels })} suggestions={allLabels} />
                    </div>

                    {/* Recurrence */}
                    <div className="space-y-2">
                        <label htmlFor="task-recurrence" className="text-sm font-semibold text-neutral-300">Repeat</label>
                        <div className="relative">
                            <Repeat size={16} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
                            <select
                                id="task-recurrence"
                                value={form.recurrence}
                                onChange={(e) => set({ recurrence: e.target.value })}
                                className={`${fieldCls} appearance-none pl-10 pr-10 py-3 cursor-pointer`}
                            >
                                {RECURRENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <ChevronDown size={16} aria-hidden="true" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500" />
                        </div>
                        {form.recurrence && <p className="text-xs text-neutral-400">When completed, the next one is created automatically.</p>}
                    </div>
                </div>

                {/* Priority Pills */}
                <fieldset className="space-y-3">
                    <legend className="text-sm font-semibold text-neutral-300 mb-3">Priority</legend>
                    <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Priority">
                        {PRIORITY_OPTIONS.map(level => {
                            const isActive = form.priority === level;
                            return (
                                <button
                                    key={level}
                                    type="button"
                                    role="radio"
                                    aria-checked={isActive}
                                    onClick={() => set({ priority: level })}
                                    className={`px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200 min-h-10 ${isActive ? PRIORITY_ACTIVE[level] : 'border-edge text-neutral-400 bg-base hover:bg-panel'}`}
                                >
                                    {level}
                                </button>
                            );
                        })}
                    </div>
                </fieldset>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-panel border-t border-raised flex justify-between items-center gap-3 sticky bottom-0">
                <span className="hidden sm:block text-xs text-neutral-400">Ctrl + Enter to create</span>
                <div className="flex justify-end gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={close}
                        className="px-6 py-2.5 rounded-lg text-sm font-semibold text-neutral-300 bg-card border border-edge hover:bg-raised transition-all shadow-sm w-full sm:w-auto"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-accent-600 text-white hover:bg-accent-500 transition-all w-full sm:w-auto"
                    >
                        <Plus size={16} aria-hidden="true" /> Create Task
                    </button>
                </div>
            </div>
        </Modal>
    );
}
