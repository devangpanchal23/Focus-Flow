import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTaskStore } from '../../store/useTaskStore';

export default function CreateTaskModal({ isOpen, onClose }) {
    const { addTask } = useTaskStore();
    const [title, setTitle] = useState('');
    const [priority, setPriority] = useState('medium');
    const [project, setProject] = useState('Inbox');
    const [estimatedMinutes, setEstimatedMinutes] = useState(60);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        try {
            await addTask(title, priority, project, estimatedMinutes * 60);

            // Reset and close
            setTitle('');
            setPriority('medium');
            setProject('Inbox');
            setEstimatedMinutes(60);
            onClose();
        } catch (error) {
            console.error('Create task error:', error);
            alert(error.message || 'Failed to create task. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h2 className="text-lg font-bold text-slate-800">Create New Task</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Task Name
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Priority
                            </label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            >
                                <option value="high">High Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="low">Low Priority</option>
                                <option value="p4">Backlog</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Project
                            </label>
                            <input
                                type="text"
                                value={project}
                                onChange={(e) => setProject(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Estimated Time (Minutes)
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={estimatedMinutes}
                            onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim()}
                            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
