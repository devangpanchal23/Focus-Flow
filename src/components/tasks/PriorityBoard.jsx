import React from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { cn } from '../../lib/utils';
import { MoreHorizontal, Plus } from 'lucide-react';
import CreateTaskModal from './CreateTaskModal';

export default function PriorityBoard() {
    const { tasks, addTask } = useTaskStore();
    const [isCreateModalOpen, setCreateModalOpen] = React.useState(false);

    const columns = [
        {
            id: 'high',
            label: 'HIGH PRIORITY',
            borderTop: 'border-t-rose-500',
            countColor: 'bg-rose-100 text-rose-600'
        },
        {
            id: 'medium',
            label: 'MEDIUM PRIORITY',
            borderTop: 'border-t-amber-500',
            countColor: 'bg-amber-100 text-amber-600'
        },
        {
            id: 'low',
            label: 'LOW PRIORITY',
            borderTop: 'border-t-emerald-500',
            countColor: 'bg-emerald-100 text-emerald-600'
        },
        {
            id: 'p4',
            label: 'BACKLOG',
            borderTop: 'border-t-slate-400',
            countColor: 'bg-slate-100 text-slate-600'
        },
    ];

    return (
        <div className="flex h-full overflow-x-auto pb-6 px-6 gap-8 snap-x">
            {columns.map((col) => {
                const colTasks = tasks.filter(t => t.priority === col.id && !t.completed);

                return (
                    <div key={col.id} className="flex-shrink-0 w-80 md:w-96 flex flex-col h-full snap-center">
                        {/* Column Header Card */}
                        <div className={cn(
                            "bg-white rounded-t-xl shadow-sm border-x border-b border-slate-100 p-5 mb-8 border-t-[5px]",
                            col.borderTop
                        )}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-700 tracking-wide text-xs">
                                        {col.label}
                                    </span>
                                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", col.countColor)}>
                                        {colTasks.length}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <MoreHorizontal size={16} className="cursor-pointer hover:text-slate-600" />
                                    <Plus
                                        size={16}
                                        className="cursor-pointer hover:text-slate-600"
                                        onClick={() => setCreateModalOpen(true)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Task List */}
                        <div className="space-y-4 overflow-y-auto flex-1 custom-scrollbar pr-2">
                            {colTasks.length === 0 ? (
                                <div className="text-center py-6 text-slate-300 text-xs font-medium border-2 border-dashed border-slate-100 rounded-lg">
                                    No Tasks
                                </div>
                            ) : (
                                colTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 hover:shadow-md transition-shadow group cursor-default"
                                    >
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                                            {task.project || 'Board'}
                                        </p>
                                        <p className="text-sm font-medium text-slate-700 leading-snug">
                                            {task.title}
                                        </p>
                                    </div>
                                ))
                            )}

                            <button
                                onClick={() => setCreateModalOpen(true)}
                                className="flex items-center gap-2 text-slate-400 hover:text-slate-600 text-xs font-medium py-2 px-1 transition-colors"
                            >
                                <Plus size={14} />
                                NEW TASK
                            </button>
                        </div>
                    </div>
                )
            })}

            <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setCreateModalOpen(false)}
            />
        </div>
    );
}
