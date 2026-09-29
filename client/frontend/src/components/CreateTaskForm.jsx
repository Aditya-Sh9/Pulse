import React, { useState, useEffect } from 'react';
import { X, UserCircle, ChevronDown, Calendar, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';

const PRIORITY_OPTIONS = ['Low', 'Normal', 'High'];

const PRIORITY_ACTIVE = {
    Low: 'border-neutral-600 bg-neutral-800 text-neutral-200 shadow-sm',
    Normal: 'border-yellow-600 bg-yellow-900/30 text-yellow-500 shadow-sm',
    High: 'border-red-900/50 bg-red-900/20 text-red-400 shadow-sm',
};

// Modal for creating a task. Escape closes it; Ctrl/Cmd+Enter submits from any field.
export default function CreateTaskForm({ onCreate, onCancel, defaultStatus, defaultDueDate = '' }) {
    const { currentUser, userRole } = useAuth();
    const { members } = useProject();
    const [form, setForm] = useState({ title: '', description: '', assigneeId: '', priority: 'Normal', dueDate: defaultDueDate });

    // Employees can only assign to themselves (enforced by Firestore rules as well)
    const assignable = userRole === 'admin' ? members : members.filter(m => m.id === currentUser?.uid);

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCancel]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        onCreate({ ...form, title: form.title.trim() });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
            <form
                onSubmit={handleSubmit}
                onKeyDown={handleKeyDown}
                role="dialog"
                aria-modal="true"
                aria-labelledby="create-task-title"
                className="relative z-10 w-full max-w-2xl bg-card border border-edge rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-raised flex justify-between items-start bg-card">
                    <div>
                        <h3 id="create-task-title" className="text-xl font-bold text-white mb-1">Create New Task {defaultStatus && `(${defaultStatus})`}</h3>
                        <p className="text-sm text-neutral-400">Fill in the details below to add a new item to your project.</p>
                    </div>
                    <button type="button" onClick={onCancel} aria-label="Close" className="p-1 rounded-md text-neutral-400 hover:bg-raised hover:text-neutral-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col gap-6 p-6 overflow-y-auto max-h-[70vh]">
                    {/* Title */}
                    <div className="space-y-2">
                        <label htmlFor="task-title" className="text-sm font-semibold text-neutral-300 flex">
                            Task Title <span className="text-red-500 ml-1">*</span>
                        </label>
                        <input
                            id="task-title"
                            value={form.title}
                            maxLength={300}
                            required
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g. Redesign homepage navigation"
                            className="w-full bg-base border border-edge text-neutral-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all placeholder-neutral-600"
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label htmlFor="task-description" className="text-sm font-semibold text-neutral-300">Description</label>
                        <textarea
                            id="task-description"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Add details, context, or acceptance criteria..."
                            className="w-full bg-base border border-edge text-neutral-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all placeholder-neutral-600 min-h-[120px] resize-y"
                        />
                    </div>

                    {/* 2-Column Grid for Assignee and Due Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        {/* Assignee */}
                        <div className="space-y-2">
                            <label htmlFor="task-assignee" className="text-sm font-semibold text-neutral-300">Assignee</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                                    <UserCircle size={18} />
                                </div>
                                <select
                                    id="task-assignee"
                                    value={form.assigneeId}
                                    onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                                    className="w-full appearance-none bg-base border border-edge text-neutral-200 rounded-lg pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 cursor-pointer"
                                >
                                    <option value="">Unassigned</option>
                                    {assignable.map(m => (
                                        <option key={m.id} value={m.id}>{m.name || m.email}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-500">
                                    <ChevronDown size={16} />
                                </div>
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="space-y-2">
                            <label htmlFor="task-due" className="text-sm font-semibold text-neutral-300">Due Date</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                                    <Calendar size={18} />
                                </div>
                                <input
                                    id="task-due"
                                    type="date"
                                    value={form.dueDate}
                                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                    className="w-full bg-base border border-edge text-neutral-200 rounded-lg py-3 pr-4 pl-10 text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 [color-scheme:dark] cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Priority Pills */}
                    <div className="space-y-3">
                        <span className="text-sm font-semibold text-neutral-300">Priority</span>
                        <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Priority">
                            {PRIORITY_OPTIONS.map(level => {
                                const isActive = form.priority === level;
                                return (
                                    <button
                                        key={level}
                                        type="button"
                                        role="radio"
                                        aria-checked={isActive}
                                        onClick={() => setForm({ ...form, priority: level })}
                                        className={`px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${isActive ? PRIORITY_ACTIVE[level] : 'border-edge text-neutral-400 bg-base hover:bg-panel'}`}
                                    >
                                        {level}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-panel border-t border-raised flex justify-between items-center gap-3">
                    <span className="hidden sm:block text-xs text-neutral-500">Ctrl + Enter to create</span>
                    <div className="flex justify-end gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-neutral-300 bg-card border border-edge hover:bg-raised transition-all shadow-sm w-full sm:w-auto"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!form.title.trim()}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-accent-600 text-white hover:bg-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto"
                        >
                            <Plus size={16} /> Create Task
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
