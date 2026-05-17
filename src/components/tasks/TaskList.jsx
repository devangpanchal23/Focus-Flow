import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTaskStore } from '../../store/useTaskStore';
import { useTimerStore } from '../../store/useTimerStore';
import TaskItem from './TaskItem';
import { Plus, Search, Filter } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function TaskList({ tasks, viewFilter }) {
    const { reorderTasks, addTask, setActiveTask } = useTaskStore();
    const { startTimer, setMode } = useTimerStore();

    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('p4');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = tasks.findIndex((t) => t.id === active.id);
            const newIndex = tasks.findIndex((t) => t.id === over.id);

            const newOrder = arrayMove(tasks, oldIndex, newIndex);
            reorderTasks(newOrder); // Update store
            // Note: In a real app we'd need to sync global 'tasks' vs filtered local 'tasks'
            // But for this demo 'tasks' prop is likely just reference to store tasks if we are viewing 'All' 
        }
    };

    const submitTask = async (e) => {
        if (e) e.preventDefault();
        if (!newTaskTitle.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await addTask(newTaskTitle, newTaskPriority, 'Inbox');
            setNewTaskTitle('');
            setNewTaskPriority('p4'); // Reset to default
        } catch (error) {
            alert('Failed to create task. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePlay = (id) => {
        setActiveTask(id);
        setMode('focus');
        // In a real router app, we'd navigate to /focus
        // Here we implicitly expect user to go to focus tab or we show a toast 
    };

    return (
        <div className="space-y-6">
            {/* Input Area */}
            <div className="relative group">
                <button 
                    type="button"
                    onClick={submitTask}
                    disabled={!newTaskTitle.trim() || isSubmitting}
                    className="absolute inset-y-0 left-4 flex items-center transition-colors text-slate-400 group-focus-within:text-indigo-500 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                    aria-label="Create Task"
                >
                    <Plus />
                </button>
                <input
                    type="text"
                    placeholder="Add a new task... (Press Enter)"
                    className="w-full py-4 pl-12 pr-36 sm:pr-32 bg-white border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 placeholder:text-slate-400"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            submitTask();
                        }
                    }}
                    enterKeyHint="done"
                />
                <div className="absolute inset-y-0 right-4 flex items-center gap-2">
                    <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value)}
                        className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                        <option value="p4">P4</option>
                    </select>
                    <button
                        type="button"
                        onClick={submitTask}
                        disabled={!newTaskTitle.trim() || isSubmitting}
                        className="flex items-center justify-center p-1.5 bg-indigo-600 text-white rounded-lg sm:hidden hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400"
                        aria-label="Add Task"
                    >
                        <Plus size={16} strokeWidth={3} />
                    </button>
                    <span className="text-xs font-mono text-slate-300 border border-slate-200 px-1.5 py-0.5 rounded hidden sm:inline-block">⏎</span>
                </div>
            </div>

            {/* Task List */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={tasks}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-3 pb-20">
                        {tasks.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <p>No tasks found. Add one above!</p>
                            </div>
                        ) : (
                            tasks.map((task) => (
                                <TaskItem key={task.id} task={task} onPlay={handlePlay} />
                            ))
                        )}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
