import React from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { cn } from '../../lib/utils';
import { Plus } from 'lucide-react';

export default function EisenhowerMatrix() {
    const { tasks } = useTaskStore();

    const quadrants = [
        {
            id: 'do_first',
            label: 'Do First',
            subLabel: 'Urgent & Important',
            bg: 'bg-rose-50',
            border: 'border-rose-200',
            text: 'text-rose-700',
            filter: (t) => t.priority === 'high' && !t.completed
        },
        {
            id: 'schedule',
            label: 'Schedule',
            subLabel: 'Less Urgent & Important',
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-700',
            filter: (t) => t.priority === 'medium' && !t.completed
        },
        {
            id: 'delegate',
            label: 'Delegate',
            subLabel: 'Urgent & Less Important',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            text: 'text-emerald-700',
            filter: (t) => t.priority === 'low' && !t.completed
        },
        {
            id: 'dont_do',
            label: "Don't Do",
            subLabel: 'Not Urgent & Not Important',
            bg: 'bg-slate-50',
            border: 'border-slate-200',
            text: 'text-slate-700',
            filter: (t) => (t.priority === 'p4' || !t.priority) && !t.completed
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full pb-6">
            {quadrants.map((quad) => {
                const quadTasks = tasks.filter(quad.filter);

                return (
                    <div
                        key={quad.id}
                        className={cn(
                            "flex flex-col rounded-2xl border-2 p-4 h-full min-h-[300px] transition-all hover:shadow-sm",
                            quad.bg,
                            quad.border
                        )}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className={cn("font-bold text-lg", quad.text)}>
                                    {quad.label}
                                </h3>
                                <p className="text-xs font-medium text-slate-500 opacity-80">
                                    {quad.subLabel}
                                </p>
                            </div>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold bg-white/50 backdrop-blur-sm border border-white/20",
                                quad.text
                            )}>
                                {quadTasks.length}
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {quadTasks.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                                    <p className="text-sm font-medium">Empty Quadrant</p>
                                </div>
                            ) : (
                                quadTasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="bg-white/80 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-white/50 hover:shadow-md transition-all cursor-default group"
                                    >
                                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">
                                            {task.project || 'Task'}
                                        </p>
                                        <p className="text-sm font-medium text-slate-700 leading-snug">
                                            {task.title}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
