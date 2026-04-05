import React, { useEffect, useRef } from 'react';
import { useTimerStore } from '../store/useTimerStore';

export default function GlobalTimer() {
    const {
        isActive,
        timeLeft,
        decrementTime,
        mode,
        elapsedSinceBreak,
        triggerBreak,
        restoreFocus
    } = useTimerStore();

    // Sound refs (placeholder)
    const alarmRef = useRef(null);

    // Main Timer Loop
    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                decrementTime();

                // Check for Auto-Break Logic
                // 45 minutes = 45 * 60 = 2700 seconds
                if (mode === 'focus' && elapsedSinceBreak >= 2700) {
                    // Notify User
                    if (Notification.permission === 'granted') {
                        new Notification("Time for a break!", { body: "You've focused for 45 minutes. Taking a 5 minute break." });
                    } else if (Notification.permission !== 'denied') {
                        Notification.requestPermission();
                    }
                    // Trigger Break
                    triggerBreak();
                }

            }, 1000);
        } else if (isActive && timeLeft === 0) {
            clearInterval(interval);

            // Handle End of Auto-Break
            if (mode === 'autoBreak') {
                // Notify
                if (Notification.permission === 'granted') {
                    new Notification("Break Over!", { body: "Ready to resume focus?" });
                }
                // Resume Focus
                restoreFocus();
            }
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, mode, elapsedSinceBreak, decrementTime, triggerBreak, restoreFocus]);

    // Document Title Update
    useEffect(() => {
        if (!timeLeft) {
            document.title = 'BlitzIt';
            return;
        }

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        let status = 'Focus';
        if (mode === 'shortBreak' || mode === 'longBreak' || mode === 'autoBreak') status = 'Break';

        document.title = isActive ? `${formatted} - ${status}` : 'BlitzIt';

        return () => { document.title = 'BlitzIt'; };
    }, [timeLeft, isActive, mode]);

    return null; // This component handles logic only, no UI
}
