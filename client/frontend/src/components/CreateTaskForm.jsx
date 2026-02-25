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
        <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-2xl bg-[#FCFCFD] dark:bg-[#1E1F21] border border-gray-200 dark:border-[#3E4045] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-[#2B2D31] flex justify-between items-start bg-white dark:bg-[#1E1F21]">
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Create New Task {defaultStatus && `(${defaultStatus})`}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Fill in the details below to add a new item to your project.</p>
                </div>
                <button type="button" onClick={onCancel} className="p-1 rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2B2D31] hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                    <X size={20} />
                </button>
            </div>

            <div className="flex flex-col gap-6 p-6 overflow-y-auto max-h-[70vh]">
                {/* Title */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex">
                        Task Title <span className="text-red-500 ml-1">*</span>
                    </label>
                    <input
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. Redesign homepage navigation"
                        className="w-full bg-white dark:bg-[#111] border border-gray-300 dark:border-[#3E4045] text-gray-900 dark:text-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-purple-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-purple-500 transition-all placeholder-gray-400 dark:placeholder-gray-600"
                        autoFocus
                    />
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Description</label>
                    <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Add details, context, or acceptance criteria..."
                        className="w-full bg-white dark:bg-[#111] border border-gray-300 dark:border-[#3E4045] text-gray-900 dark:text-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-purple-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-purple-500 transition-all placeholder-gray-400 dark:placeholder-gray-600 min-h-[120px] resize-y"
                    />
                </div>

                {/* 2-Column Grid for Assignee and Due Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    {/* Assignee */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Assignee</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                                <UserCircle size={18} />
                            </div>
                            <select
                                value={form.assigneeId}
                                onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                                className="w-full appearance-none bg-white dark:bg-[#111] border border-gray-300 dark:border-[#3E4045] text-gray-900 dark:text-gray-200 rounded-lg pl-10 pr-10 py-3 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-purple-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-purple-500 cursor-pointer"
                            >
                                <option value="">Unassigned</option>
                                {(userRole === 'admin' ? members : members.filter(m => m.id === currentUser?.uid)).map(m => (
                                    <option key={m.id} value={m.id}>{m.name || m.email}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                                <ChevronDown size={16} />
                            </div>
                        </div>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Due Date</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                                <Calendar size={18} />
                            </div>
                            <input
                                type="date"
                                value={form.dueDate}
                                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                                className="w-full bg-white dark:bg-[#111] border border-gray-300 dark:border-[#3E4045] text-gray-900 dark:text-gray-200 rounded-lg py-3 pr-4 pl-10 text-sm focus:outline-none focus:border-blue-500 dark:focus:border-purple-500 focus:ring-1 focus:ring-blue-500 dark:focus:ring-purple-500 [color-scheme:light_dark] cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Priority Pills */}
                <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Priority</label>
                    <div className="flex flex-wrap gap-3">
                        {PRIORITY_OPTIONS.map(level => {
                            const isActive = form.priority === level;
                            let colors = "border-gray-200 text-gray-600 bg-white hover:bg-gray-50 dark:border-[#3E4045] dark:text-gray-400 dark:bg-[#111] dark:hover:bg-[#1A1C1F]"; // default

                            if (isActive) {
                                if (level === 'Low') colors = "border-gray-300 bg-gray-100 text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 shadow-sm";
                                if (level === 'Medium') colors = "border-yellow-400 bg-yellow-50 text-yellow-800 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-500 shadow-sm";
                                if (level === 'High') colors = "border-red-300 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400 shadow-sm";
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
            <div className="px-6 py-4 bg-gray-50 dark:bg-[#181A1D] border-t border-gray-100 dark:border-[#2B2D31] flex justify-end items-center">
                <div className="flex justify-end gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-2.5 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1E1F21] border border-gray-300 dark:border-[#3E4045] hover:bg-gray-50 dark:hover:bg-[#2B2D31] transition-all shadow-sm w-full sm:w-auto"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold bg-blue-600 dark:bg-indigo-600 text-white hover:bg-blue-700 dark:hover:bg-indigo-500 shadow-lg shadow-blue-500/20 dark:shadow-indigo-900/30 transition-all w-full sm:w-auto"
                    >
                        <Plus size={16} /> Create Task
                    </button>
                </div>
            </div>
        </form>
    );
}
