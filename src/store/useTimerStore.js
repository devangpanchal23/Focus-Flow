import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTimerStore = create(
    persist(
        (set) => ({
            timeLeft: 25 * 60, // 25 minutes in seconds
            initialTime: 25 * 60,
            isActive: false,
            mode: 'focus', // 'focus', 'shortBreak', 'longBreak'

            // Session State
            totalSessions: 0,
            currentSession: 0,
            sessionDuration: 60 * 60, // Default 1 hour

            // Auto-Break State
            elapsedSinceBreak: 0,
            savedTimeLeft: null,

            startTimer: () => set({ isActive: true }),
            pauseTimer: () => set({ isActive: false }),
            resetTimer: () => set((state) => ({
                isActive: false,
                timeLeft: state.initialTime
            })),

            setTime: (time) => set({ timeLeft: time }),

            setMode: (mode) => {
                let time;
                switch (mode) {
                    case 'shortBreak': time = 5 * 60; break;
                    case 'longBreak': time = 15 * 60; break;
                    default: time = 25 * 60;
                }
                set({ mode, timeLeft: time, initialTime: time, isActive: false });
            },

            // Session Actions
            initSession: (total, duration = 60 * 60) => set({
                totalSessions: total,
                currentSession: 1,
                sessionDuration: duration,
                timeLeft: duration,
                initialTime: duration,
                isActive: false,
                mode: 'focus'
            }),

            nextSession: () => set((state) => {
                if (state.currentSession < state.totalSessions) {
                    return {
                        currentSession: state.currentSession + 1,
                        timeLeft: state.sessionDuration,
                        initialTime: state.sessionDuration,
                        isActive: false
                    };
                }
                return state;
            }),

            stopSession: () => set({
                totalSessions: 0,
                currentSession: 0,
                isActive: false,
                timeLeft: 25 * 60,
                initialTime: 25 * 60,
                elapsedSinceBreak: 0,
                savedTimeLeft: null
            }),

            triggerBreak: () => set((state) => ({
                savedTimeLeft: state.timeLeft,
                mode: 'autoBreak',
                initialTime: 5 * 60,
                timeLeft: 5 * 60,
                isActive: true,
                elapsedSinceBreak: 0
            })),

            restoreFocus: () => set((state) => ({
                mode: 'focus',
                timeLeft: state.savedTimeLeft || 25 * 60,
                isActive: true, // Auto-resume
                savedTimeLeft: null,
                initialTime: state.sessionDuration // Restore initial focus duration (approx)
            })),

            decrementTime: () => set((state) => {
                if (state.timeLeft <= 0) {
                    return { isActive: false, timeLeft: 0 };
                }

                const updates = { timeLeft: state.timeLeft - 1 };

                // Track continuous focus time for auto-break
                if (state.mode === 'focus') {
                    updates.elapsedSinceBreak = (state.elapsedSinceBreak || 0) + 1;
                }

                return updates;
            }),
        }),
        {
            name: 'timer-storage',
        }
    )
);
