import React from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { Play, CheckCircle2, Pin } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function PinnedTask() {
    const { tasks, activeTaskId, toggleTask } = useTaskStore();

    // Find active task or fallback to the first high priority one, or just the first incomplete one
    const pinnedTask = tasks.find(t => t.id === activeTaskId)
        || tasks.find(t => t.priority === 'high' && !t.completed)
        || tasks.find(t => !t.completed);

    if (!pinnedTask) return (
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center justify-center h-full min-h-[160px]">
            <div className="text-center text-slate-400">
                <Pin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No active tasks. Time to relax!</p>
            </div>
        </div>
    );

    return (
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden h-full min-h-[160px] flex flex-col justify-between group">
            {/* Decorative background shapes */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium tracking-wide">
                        UP NEXT
                    </span>
                    <Pin className="w-5 h-5 text-white/50" />
                </div>

                <h3 className="text-xl font-semibold leading-tight mb-2 line-clamp-2">
                    {pinnedTask.title}
                </h3>

                {pinnedTask.project && (
                    <span className="text-indigo-100 text-sm opacity-80">
                        #{pinnedTask.project}
                    </span>
                )}
            </div>

            <div className="flex gap-3 mt-4 relative z-10">
                <button
                    onClick={() => toggleTask(pinnedTask.id)}
                    className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm p-2 rounded-lg flex items-center justify-center transition-colors"
                >
                    <CheckCircle2 className="w-5 h-5" />
                </button>
                <button className="flex-[3] bg-white text-indigo-600 hover:bg-indigo-50 font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm">
                    <Play className="w-4 h-4 fill-current" />
                    <span>Focus Now</span>
                </button>
            </div>
        </div>
    );
}
