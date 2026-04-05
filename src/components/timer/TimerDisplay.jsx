import React from 'react';
import { cn } from '../../lib/utils';
import { useTimerStore } from '../../store/useTimerStore';

export default function TimerDisplay() {
    const { timeLeft, mode, initialTime } = useTimerStore();

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Calculate progress for strict ring or bar - simplified here to just text for clean look
    // but let's add a subtle progress bar at the bottom
    const progress = ((initialTime - timeLeft) / initialTime) * 100;

    return (
        <div className="flex flex-col items-center justify-center py-12 relative">
            {/* Mode Badge */}
            <div className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium tracking-wide mb-8 uppercase transition-colors",
                mode === 'focus' ? "bg-indigo-100 text-indigo-600" : "bg-emerald-100 text-emerald-600"
            )}>
                {mode === 'focus' ? 'Deep Focus' : 'Break Time'}
            </div>

            {/* Main Time */}
            <h1 className="text-6xl sm:text-8xl md:text-9xl font-bold text-slate-800 font-mono tracking-tighter tabular-nums select-none">
                {formattedTime}
            </h1>

            {/* Subtle Progress Bar */}
            <div className="w-64 h-2 bg-slate-100 rounded-full mt-8 overflow-hidden">
                <div
                    className={cn(
                        "h-full transition-all duration-1000 ease-linear",
                        mode === 'focus' ? "bg-indigo-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${100 - progress}%` }} // Counts down visually
                />
            </div>
        </div>
    );
}
