import React from 'react';
import { useTimerStore } from '../../store/useTimerStore';
import { Play, Pause, RotateCcw, Coffee, Zap, Brain } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Controls() {
    const { isActive, startTimer, pauseTimer, resetTimer, setMode, mode } = useTimerStore();

    return (
        <div className="flex flex-col items-center gap-8">
            {/* Main Controls */}
            <div className="flex items-center gap-6">
                <button
                    onClick={resetTimer}
                    className="p-4 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    title="Reset"
                >
                    <RotateCcw size={24} />
                </button>

                <button
                    onClick={isActive ? pauseTimer : startTimer}
                    className={cn(
                        "p-8 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center",
                        isActive
                            ? "bg-slate-100 text-slate-600"
                            : "bg-indigo-600 text-white shadow-indigo-200"
                    )}
                >
                    {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                </button>

                {/* Spacer to balance reset button visually, could be settings or skip */}
                <div className="w-14"></div>
            </div>

            {/* Mode Toggles */}
            <div className="flex flex-wrap justify-center p-1 bg-slate-100 rounded-xl">
                {[
                    { id: 'focus', label: 'Focus', icon: Brain },
                    { id: 'shortBreak', label: 'Short Break', icon: Coffee },
                    { id: 'longBreak', label: 'Long Break', icon: Zap },
                ].map((m) => (
                    <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all",
                            mode === m.id
                                ? "bg-white text-slate-800 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        )}
                    >
                        <m.icon size={16} />
                        <span>{m.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
