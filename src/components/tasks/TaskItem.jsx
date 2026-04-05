import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, Play, Flag, GripVertical, Trash2, Pencil, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTaskStore } from '../../store/useTaskStore'; // Needed for delete/toggle actions if passed down or accessed directly
// Ideally props should be passed, but accessing store directly for actions is cleaner here.

export default function TaskItem({ task, onPlay }) {
    const { toggleTask, deleteTask, updateTask } = useTaskStore();
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);
    const [editPriority, setEditPriority] = useState(task.priority);

    const handleSave = () => {
        if (editTitle.trim()) {
            updateTask(task.id, { title: editTitle, priority: editPriority });
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditTitle(task.title);
        setEditPriority(task.priority);
        setIsEditing(false);
    };

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const priorityColors = {
        high: 'text-rose-500 bg-rose-50 border-rose-100',
        medium: 'text-amber-500 bg-amber-50 border-amber-100',
        low: 'text-slate-400 bg-slate-50 border-slate-100',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all active:cursor-grabbing",
                task.completed && "opacity-60 grayscale-[0.5]"
            )}
        >
            <button
                {...attributes}
                {...listeners}
                className="touch-none text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
            >
                <GripVertical size={20} />
            </button>

            <button
                onClick={() => toggleTask(task.id)}
                className={cn(
                    "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                    task.completed
                        ? "bg-indigo-500 border-indigo-500 text-white"
                        : "border-slate-300 hover:border-indigo-500 text-transparent"
                )}
            >
                <Check size={14} strokeWidth={3} />
            </button>

            <div className="flex-1 min-w-0">
                {isEditing ? (
                    <div className="flex gap-2 items-center mr-2">
                        <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 py-1 px-2 border border-indigo-200 rounded text-sm focus:outline-none focus:border-indigo-500"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        />
                    </div>
                ) : (
                    <>
                        <p className={cn(
                            "text-sm font-medium text-slate-700 truncate transition-all",
                            task.completed && "line-through text-slate-400"
                        )}>
                            {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            {task.project && (
                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                    #{task.project}
                                </span>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Actions */}
            <div className={cn(
                "flex items-center gap-2 transition-opacity",
                isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
                {isEditing ? (
                    <>
                        <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value)}
                            className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded px-1 py-1 focus:outline-none focus:border-indigo-500"
                        >
                            <option value="high">High</option>
                            <option value="medium">Med</option>
                            <option value="low">Low</option>
                            <option value="p4">P4</option>
                        </select>
                        <button onClick={handleSave} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded">
                            <Check size={16} />
                        </button>
                        <button onClick={handleCancel} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                            <X size={16} />
                        </button>
                    </>
                ) : (
                    <>
                        <div className={cn("px-2 py-1 rounded text-xs font-semibold border", priorityColors[task.priority])}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </div>

                        <button
                            onClick={() => {
                                setEditTitle(task.title);
                                setEditPriority(task.priority);
                                setIsEditing(true);
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                        >
                            <Pencil size={16} />
                        </button>

                        <button
                            onClick={() => onPlay(task.id)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Start Focus"
                        >
                            <Play size={16} fill="currentColor" />
                        </button>

                        <button
                            onClick={() => deleteTask(task.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
