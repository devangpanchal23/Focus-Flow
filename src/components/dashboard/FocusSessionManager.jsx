import React, { useState, useEffect, useRef } from 'react';
import { useTaskStore } from '../../store/useTaskStore';
import { useTimerStore } from '../../store/useTimerStore';
import { Play, Pause, Square, Clock, CheckCircle2, Zap, PartyPopper } from 'lucide-react';
import { cn } from '../../lib/utils';
import confetti from 'canvas-confetti';

export default function FocusSessionManager({ tasks, onTaskUpdate }) {
    const { activeTaskId, setActiveTask, toggleTask } = useTaskStore();
    const {
        isActive,
        startTimer,
        pauseTimer,
        resetTimer,
        initSession,
        stopSession,
        timeLeft,
        initialTime,
        decrementTime,
        setTime
    } = useTimerStore();

    const [selectedTaskId, setSelectedTaskId] = useState(activeTaskId || '');
    // Initialize with 0, will be set by effect
    const [estimatedSeconds, setEstimatedSeconds] = useState(0);
    const [mode, setMode] = useState('selection'); // 'selection', 'active'
    const [showSuccess, setShowSuccess] = useState(false);

    // Persistence: Save state on change - REMOVED since store handles it now
    // We only keep local 'estimatedSeconds' sync if needed, but mostly we rely on store.
    // However, we still need to persist 'activeTaskId' if the store doesn't (Store doesn't persist activeTaskId yet? Let's check).
    // The store persists 'timeLeft', 'isActive', 'mode'. It does NOT persist 'activeTaskId' or 'estimatedSeconds' (local state).
    // So we should keep minimal persistence for THIS component's local state if strictly needed, 
    // OR we could move activeTaskId to the store? 
    // For now, to solve the user's specific request about the *timer* stopping, the store persistence is the key.
    // The user's issue was "after refresh that working stop". Store persistence fixes the timer state.
    // If we want the *Task Selection* to remain, we should keep the local storage for that, OR move it to store.
    // Let's keep the local storage for 'selectedTaskId' and 'estimatedSeconds' but REMOVE the timer state (timeLeft, isActive) from here
    // to avoid conflicts with the store's hydration.

    useEffect(() => {
        const savedState = localStorage.getItem('focusSessionLocalState');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            if (parsed.selectedTaskId) setSelectedTaskId(parsed.selectedTaskId);
            if (parsed.estimatedSeconds) setEstimatedSeconds(parsed.estimatedSeconds);
        }
    }, []);

    useEffect(() => {
        // Save only local UI state, not the timer state
        localStorage.setItem('focusSessionLocalState', JSON.stringify({
            selectedTaskId,
            estimatedSeconds,
            lastTimestamp: Date.now()
        }));
    }, [selectedTaskId, estimatedSeconds]);

    // Sync local selection with global active task
    useEffect(() => {
        if (activeTaskId) setSelectedTaskId(activeTaskId);
    }, [activeTaskId]);

    // When selected task changes, update estimated time from task data
    useEffect(() => {
        if (selectedTaskId) {
            const task = tasks.find(t => t.id === selectedTaskId);
            if (task) {
                const remaining = Math.max(0, (task.estimatedTime || 0) - (task.timeSpent || 0));
                setEstimatedSeconds(remaining > 0 ? remaining : 3600);
            }
        }
    }, [selectedTaskId, tasks]);

    // Sync local View Mode with Global Timer State
    // This allows the Focus Component and Dashboard Widget to work in parallel
    useEffect(() => {
        // We consider the session 'active' if the timer is running OR if time has elapsed (paused)
        // We check (timeLeft < initialTime) assuming standard countdown.
        const isGlobalSessionActive = isActive || (timeLeft < initialTime && timeLeft > 0);

        if (isGlobalSessionActive) {
            if (mode !== 'active') setMode('active');
        } else {
            // Timer is effectively reset or finished
            if (mode === 'active' && !showSuccess) {
                // If we were in active mode (and not showing the success screen), go back to selection
                setMode('selection');
            }
        }
    }, [isActive, timeLeft, initialTime, mode, showSuccess]);

    // Timer Tick Logic & Auto-Completion (Modified to just listen for completion)
    // GlobalTimer handles the decrementTime() now.
    useEffect(() => {
        // We still need to check for task completion relative to the estimated time for *this specific task*
        // The store handles the 'timeLeft' (countdown), but 'estimatedSeconds' is local to this component for the slider.
        // We need to react when time passes.

        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                // We DON'T decrementTime() here anymore. GlobalTimer does it.

                // We DO check for auto-complete of the task based on user estimate
                const sessionElapsed = initialTime - timeLeft;
                if (estimatedSeconds - sessionElapsed <= 0 && estimatedSeconds > 0) {
                    handleAutoComplete();
                }
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, initialTime, estimatedSeconds]);

    const handleAutoComplete = () => {
        pauseTimer();
        const sessionElapsed = initialTime - timeLeft;
        if (selectedTaskId && sessionElapsed > 0) {
            onTaskUpdate(selectedTaskId, sessionElapsed);
        }
        if (selectedTaskId) toggleTask(selectedTaskId);

        setShowSuccess(true);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

        setTimeout(() => {
            stopSession();
            setMode('selection');
            resetTimer();
            setShowSuccess(false);
            setEstimatedSeconds(60 * 60);
        }, 3000);
    };

    // Handle timer completion (Scenario A)
    useEffect(() => {
        if (mode === 'active' && timeLeft === 0 && isActive === false) {
            handleTimerStop(initialTime);
        }
    }, [timeLeft, isActive, mode, initialTime]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartSession = (durationMinutes) => {
        if (!selectedTaskId) return;
        setActiveTask(selectedTaskId);
        const durationSeconds = Math.floor(durationMinutes * 60);
        initSession(1, durationSeconds);
        setMode('active');
        startTimer();
    };

    const handleTimerStop = (actualDurationRan) => {
        const sessionAttend = Math.floor(actualDurationRan);
        if (selectedTaskId && sessionAttend > 0) {
            onTaskUpdate(selectedTaskId, sessionAttend);
        }
        setEstimatedSeconds(prev => Math.max(0, prev - sessionAttend));
        stopSession();
        setMode('selection');
        resetTimer();
    };

    const handleManualStop = () => {
        const elapsed = initialTime - timeLeft;
        handleTimerStop(elapsed);
    };

    const activeTask = tasks.find(t => t.id === selectedTaskId);
    const remainingTime = activeTask ? Math.max(0, (activeTask.estimatedTime || 0) - (activeTask.timeSpent || 0)) : 0;

    const formatTimeLeft = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    // RENDER: SUCCESS STATE
    if (showSuccess) {
        return (
            <div className="bg-emerald-500 rounded-2xl p-6 text-white shadow-lg h-full flex flex-col items-center justify-center text-center animate-in zoom-in duration-300">
                <div className="bg-white/20 p-4 rounded-full mb-4">
                    <PartyPopper size={48} className="text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Task Completed!</h3>
                <p className="text-emerald-100">Great focus! You crushed it.</p>
            </div>
        );
    }

    // RENDER: SELECTION MODE
    if (mode === 'selection') {
        const maxTimeSeconds = 180 * 60; // 3 hours (180 mins) max for slider

        return (
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-full flex flex-col justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Clock className="text-indigo-500" size={20} />
                        Focus Session
                    </h3>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">Select Task</label>
                            <select
                                value={selectedTaskId}
                                onChange={(e) => setSelectedTaskId(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            >
                                <option value="" disabled>Select a task...</option>
                                {tasks.filter(t => !t.completed).map(task => (
                                    <option key={task.id} value={task.id}>
                                        {task.title}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Session Duration</label>
                                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full font-mono">
                                    {formatTimeLeft(estimatedSeconds)}
                                </span>
                            </div>

                            <div className="relative h-12 w-full flex items-center select-none group">
                                {/* Track */}
                                <div className="absolute w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-100 ease-out"
                                        style={{ width: `${Math.min(100, (estimatedSeconds / maxTimeSeconds) * 100)}%` }}
                                    ></div>
                                </div>

                                {/* Slider Input */}
                                <input
                                    type="range"
                                    min="0"
                                    max={maxTimeSeconds} // 180 mins
                                    step="300" // 5 min steps
                                    value={estimatedSeconds}
                                    onChange={(e) => setEstimatedSeconds(Number(e.target.value))}
                                    className="absolute w-full h-full opacity-0 cursor-pointer z-20"
                                />

                                {/* Visual Ticks (Sound Bar style) */}
                                <div className="absolute w-full flex justify-between px-1 pointer-events-none">
                                    {[...Array(37)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-0.5 rounded-full transition-all duration-300",
                                                i % 6 === 0 ? "h-4" : "h-2", // Major ticks every 30 mins (approx)
                                                (i / 36) * maxTimeSeconds <= estimatedSeconds
                                                    ? "bg-white/50"
                                                    : "bg-slate-300/50 group-hover:bg-slate-300"
                                            )}
                                        ></div>
                                    ))}
                                </div>
                            </div>

                            {/* Clickable Labels */}
                            <div className="flex justify-between text-xs font-medium text-slate-400 mt-2 px-1">
                                {[
                                    { label: '0m', val: 0 },
                                    { label: '30m', val: 1800 },
                                    { label: '1h', val: 3600 },
                                    { label: '1.5h', val: 5400 },
                                    { label: '2h', val: 7200 },
                                    { label: '2.5h', val: 9000 },
                                    { label: '3h', val: 10800 },
                                ].map((tick) => (
                                    <button
                                        key={tick.label}
                                        onClick={() => setEstimatedSeconds(tick.val)}
                                        className="hover:text-indigo-600 hover:font-bold transition-all p-1 -ml-2 first:ml-0"
                                    >
                                        {tick.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={cn("mt-6 grid gap-3", estimatedSeconds > 0 ? "grid-cols-3" : "grid-cols-2")}>
                    <button
                        onClick={() => handleStartSession(30)}
                        disabled={!selectedTaskId}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-indigo-200"
                    >
                        <Zap size={18} fill="currentColor" />
                        <span className="text-sm">Focus 30m</span>
                    </button>
                    <button
                        onClick={() => handleStartSession(59)}
                        disabled={!selectedTaskId}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
                    >
                        <Play size={18} fill="currentColor" />
                        <span className="text-sm">Focus 59m</span>
                    </button>
                    {estimatedSeconds > 0 && (
                        <button
                            onClick={() => handleStartSession(estimatedSeconds / 60)}
                            disabled={!selectedTaskId}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-200"
                        >
                            <CheckCircle2 size={18} fill="currentColor" />
                            <span className="text-sm">Focus {Math.floor(estimatedSeconds / 60)}m</span>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // RENDER: ACTIVE MODE
    return (
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg h-full flex flex-col justify-between relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className="inline-block px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-xs font-bold tracking-wider mb-2 border border-emerald-500/30 animate-pulse">
                            FOCUS MODE
                        </span>
                        <h3 className="text-xl font-bold leading-tight line-clamp-2">
                            {activeTask?.title || 'Focus Session'}
                        </h3>
                    </div>
                    <button
                        onClick={handleManualStop}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Stop & Save"
                    >
                        <Square size={18} />
                    </button>
                </div>

                <div className="flex justify-center my-4">
                    <div className="text-5xl font-mono font-bold tracking-tighter tabular-nums">
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            <div className="relative z-10 mt-auto">
                <div className="flex gap-3">
                    <button
                        onClick={isActive ? pauseTimer : startTimer}
                        className={cn(
                            "flex-1 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all",
                            isActive
                                ? "bg-white/10 hover:bg-white/20 text-white"
                                : "bg-white text-indigo-900 hover:bg-indigo-50"
                        )}
                    >
                        {isActive ? (
                            <>
                                <Pause size={18} fill="currentColor" /> Pause
                            </>
                        ) : (
                            <>
                                <Play size={18} fill="currentColor" /> Resume
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleManualStop}
                        className="px-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl flex items-center justify-center transition-colors border border-rose-500/20"
                    >
                        <Square size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
