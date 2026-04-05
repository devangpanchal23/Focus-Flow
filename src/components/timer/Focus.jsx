import React, { useEffect } from 'react';
import TimerDisplay from './TimerDisplay';
import Controls from './Controls';
import YouTubeMusicPlayer from '../music/YouTubeMusicPlayer';
import { useTimerStore } from '../../store/useTimerStore';
import { useTaskStore } from '../../store/useTaskStore';
import { Pin } from 'lucide-react';

export default function Focus() {
    const { isActive, timeLeft, decrementTime, mode } = useTimerStore();
    const { activeTaskId, tasks } = useTaskStore();

    const activeTask = tasks.find(t => t.id === activeTaskId);

    // Timer Tick & Title Logic Removed - Handled Globally by GlobalTimer

    return (
        <div className="min-h-full flex flex-col lg:flex-row animate-in fade-in zoom-in-95 duration-500">

            {/* Main Timer Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 relative overflow-hidden bg-slate-50/30 min-h-[500px] lg:min-h-0">
                <div className="max-w-lg w-full text-center mb-8">
                    {activeTask ? (
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-full shadow-sm border border-slate-200/60 text-slate-600 mb-8 animate-in slide-in-from-top-4">
                            <Pin size={14} className="text-indigo-500" />
                            <span className="text-sm font-semibold tracking-tight">{activeTask.title}</span>
                        </div>
                    ) : (
                        <div className="h-12"></div>
                    )}
                    <TimerDisplay />
                    <div className="mt-16">
                        <Controls />
                    </div>
                </div>
            </div>

            {/* Right Sidebar / Music Player */}
            <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-slate-100 flex flex-col overflow-hidden shadow-sm z-10 shrink-0 h-[600px] lg:h-auto">
                <YouTubeMusicPlayer />
            </div>
        </div>
    );
}
