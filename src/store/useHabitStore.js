import { create } from 'zustand';

const API_URL = '/api/habits';

export const useHabitStore = create((set, get) => ({
    habits: [],
    completions: {}, // Map of habitId -> [dateStrings]
    isLoading: false,
    error: null,
    authToken: null,

    // Auth Token management
    setAuthToken: (token) => set({ authToken: token }),

    // Fetch Habits from Backend
    fetchHabits: async () => {
        const token = get().authToken;
        if (!token) return;

        set({ isLoading: true });
        try {
            const response = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch habits');

            const data = await response.json();

            // Map backend data to store format
            // Backend returns: [{ id, title, createdAt, completions: [] }]
            // We want: habits: [{ id, title, ... }], completions: { id: [] }

            const habits = data.map(h => ({
                id: h.id,
                title: h.title,
                createdAt: h.createdAt
            }));

            const completions = {};
            data.forEach(h => {
                completions[h.id] = h.completions || [];
            });

            set({ habits, completions, isLoading: false });
        } catch (err) {
            console.error('Fetch habits error:', err);
            set({ error: err.message, isLoading: false });
        }
    },

    addHabit: async (title) => {
        const token = get().authToken;
        if (!token) return;

        // Optimistic update? Maybe risky without ID. Let's wait for server.
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title })
            });

            if (!response.ok) throw new Error('Failed to create habit');
            const newHabit = await response.json();

            // Store update
            set((state) => ({
                habits: [...state.habits, { id: newHabit.id, title: newHabit.title, createdAt: newHabit.createdAt }],
                completions: { ...state.completions, [newHabit.id]: [] }
            }));

        } catch (err) {
            console.error('Add habit error:', err);
        }
    },

    removeHabit: async (id) => {
        const token = get().authToken;

        // Optimistic update
        const prevHabits = get().habits;
        const prevCompletions = get().completions;

        set((state) => {
            const newHabits = state.habits.filter(h => h.id !== id);
            const newCompletions = { ...state.completions };
            delete newCompletions[id];
            return { habits: newHabits, completions: newCompletions };
        });

        try {
            await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Delete habit error:', err);
            // Revert
            set({ habits: prevHabits, completions: prevCompletions });
        }
    },

    toggleHabit: async (habitId, dateStr) => {
        const token = get().authToken;

        // Optimistic update
        const prevCompletions = get().completions;
        set((state) => {
            const currentCompletions = state.completions[habitId] || [];
            const isCompleted = currentCompletions.includes(dateStr);

            let newCompletions;
            if (isCompleted) {
                newCompletions = currentCompletions.filter(d => d !== dateStr);
            } else {
                newCompletions = [...currentCompletions, dateStr];
            }

            return {
                completions: {
                    ...state.completions,
                    [habitId]: newCompletions
                }
            };
        });

        try {
            const response = await fetch(`${API_URL}/${habitId}/toggle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ date: dateStr })
            });

            if (!response.ok) throw new Error('Failed to toggle');

            // Optional: Sync with server response if needed, 
            // but optimistic should be fine for simple toggles.

        } catch (err) {
            console.error('Toggle habit error:', err);
            // Revert
            set({ completions: prevCompletions });
        }
    },

    getHabitStats: (monthStr) => {
        // monthStr format: YYYY-MM
        const state = get();
        const totalHabits = state.habits.length;
        if (totalHabits === 0) return { total: 0, completed: 0, percentage: 0 };

        let totalCompletedInMonth = 0;

        if (state.completions) {
            Object.values(state.completions).forEach(dates => {
                if (Array.isArray(dates)) {
                    dates.forEach(date => {
                        if (date.startsWith(monthStr)) {
                            totalCompletedInMonth++;
                        }
                    });
                }
            });
        }

        return {
            totalHabits,
            totalCompletedInMonth
        };
    }
}));
