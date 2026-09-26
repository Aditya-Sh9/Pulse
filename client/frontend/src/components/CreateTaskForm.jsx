import React, { useState } from 'react';
import { X, UserCircle, ChevronDown, Calendar, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CreateTaskForm({ onCreate, onCancel, members, defaultStatus }) {
    const { currentUser, userRole } = useAuth();
    const [form, setForm] = useState({ title: '', description: '', assigneeId: '', priority: 'Medium', dueDate: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.title.trim()) return;
        // Map 'Medium' back to 'Normal' for backend compatibility if necessary
        const submissionData = { ...form, priority: form.priority === 'Medium' ? 'Normal' : form.priority };
        onCreate(submissionData);
        setForm({ title: '', description: '', assigneeId: '', priority: 'Medium', dueDate: '' });
    };

    const PRIORITY_OPTIONS = ['Low', 'Medium', 'High'];

    return (
        <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-2xl bg-card border border-edge rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="px-6 py-5 border-b border-raised flex justify-between items-start bg-card">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">Create New Task {defaultStatus && `(${defaultStatus})`}</h3>
                    <p className="text-sm text-neutral-400">Fill in the details below to add a new item to your project.</p>
                </div>
                <button type="button" onClick={onCancel} className="p-1 rounded-md text-neutral-400 hover:bg-raised hover:text-neutral-200 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex flex-col gap-6 p-6 overflow-y-auto max-h-[70vh]">
                {/* Title */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-neutral-300 flex">
                        Task Title <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Redesign homepage navigation"
                        className="w-full bg-base border border-edge text-neutral-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-all placeholder-neutral-600"
                        autoFocus
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-neutral-300">Description</label>
                    <textarea
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
                        <label className="text-sm font-semibold text-neutral-300">Assignee</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                                <UserCircle size={18} />
                            </div>
                            <select
                                value={form.assigneeId}
                                onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                                className="w-full appearance-none bg-base border border-edge text-neutral-200 rounded-lg pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 cursor-pointer"
                            >
                                <option value="">Unassigned</option>
                                {(userRole === 'admin' ? members : members.filter(m => m.id === currentUser?.uid)).map(m => (
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
                        <label className="text-sm font-semibold text-neutral-300">Due Date</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                                <Calendar size={18} />
                            </div>
                            <input
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
                    <label className="text-sm font-semibold text-neutral-300">Priority</label>
                    <div className="flex flex-wrap gap-3">
                        {PRIORITY_OPTIONS.map(level => {
                            const isActive = form.priority === level;
                            let colors = "border-edge text-neutral-400 bg-base hover:bg-panel"; // default

                            if (isActive) {
                                if (level === 'Low') colors = "border-neutral-600 bg-neutral-800 text-neutral-200 shadow-sm";
                                if (level === 'Medium') colors = "border-yellow-600 bg-yellow-900/30 text-yellow-500 shadow-sm";
                                if (level === 'High') colors = "border-red-900/50 bg-red-900/20 text-red-400 shadow-sm";
                            }

                            return (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setForm({ ...form, priority: level })}
                                    className={`px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${colors}`}
                                >
                                    {level}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-panel border-t border-raised flex justify-end items-center">
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
                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-accent-600 text-white hover:bg-accent-500 transition-all w-full sm:w-auto"
                    >
                        <Plus size={16} /> Create Task
                    </button>
                </div>
            </div>
        </form>
    );
}
