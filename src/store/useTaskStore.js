import { create } from 'zustand';
import { format, startOfDay, endOfDay } from 'date-fns';

const API_URL = '/api/tasks';

export const useTaskStore = create((set, get) => ({
    tasks: [],
    selectedDate: new Date(),
    activeTaskId: null,
    isLoading: false,
    error: null,
    authToken: null,

    setAuthToken: (token) => set({ authToken: token }),

    fetchTasks: async () => {
        const token = get().authToken;
        if (!token) return;

        set({ isLoading: true });
        try {
            const date = get().selectedDate;
            let url = API_URL;
            if (date) {
                const start = startOfDay(date).toISOString();
                const end = endOfDay(date).toISOString();
                url = `${API_URL}?start=${start}&end=${end}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch tasks');
            const data = await response.json();
            set({ tasks: data, isLoading: false });
        } catch (err) {
            set({ error: err.message, isLoading: false });
        }
    },

    addTask: async (titleOrData, priority = 'medium', project = 'Inbox', estimatedTime = 0) => {
        const token = get().authToken;
        const selectedDate = get().selectedDate;

        try {
            let body = {};

            if (typeof titleOrData === 'object') {
                body = { ...titleOrData };
                if (!body.project) body.project = 'Inbox';
                // If createdAt is passed (e.g. from Calendar), use it, otherwise use selectedDate
                if (!body.createdAt) body.createdAt = selectedDate;
            } else {
                body = {
                    title: titleOrData,
                    priority,
                    project,
                    estimatedTime,
                    createdAt: selectedDate
                };
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create task');
            }

            const newTask = await response.json();
            set((state) => ({ tasks: [newTask, ...state.tasks] }));
        } catch (err) {
            console.error('Failed to add task:', err);
            throw err;
        }
    },

    updateTask: async (id, updates) => {
        const token = get().authToken;
        // Optimistic update
        set((state) => ({
            tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t)
        }));

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updates),
            });
            const updatedTask = await response.json();
            // Sync with server response
            set((state) => ({
                tasks: state.tasks.map((t) => t.id === id ? updatedTask : t)
            }));
        } catch (err) {
            console.error('Failed to update task:', err);
            get().fetchTasks();
        }
    },

    toggleTask: async (id) => {
        const token = get().authToken;
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;

        // Optimistic update
        set((state) => ({
            tasks: state.tasks.map((t) => t.id === id ? { ...t, completed: !t.completed } : t)
        }));

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ completed: !task.completed }),
            });
            const updatedTask = await response.json();

            set((state) => ({
                tasks: state.tasks.map((t) => t.id === id ? updatedTask : t)
            }));

        } catch (err) {
            console.error('Failed to toggle task:', err);
            // Revert on failure
            set((state) => ({
                tasks: state.tasks.map((t) => t.id === id ? { ...t, completed: task.completed } : t)
            }));
        }
    },

    deleteTask: async (id) => {
        const token = get().authToken;
        // Optimistic update
        const previousTasks = get().tasks;
        set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id)
        }));

        try {
            await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Failed to delete task:', err);
            set({ tasks: previousTasks });
        }
    },

    logTime: async (id, duration) => {
        const token = get().authToken;
        try {
            await fetch(`${API_URL}/${id}/log-time`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ duration }),
            });

            set((state) => ({
                tasks: state.tasks.map((t) =>
                    t.id === id ? { ...t, timeSpent: (t.timeSpent || 0) + duration } : t
                )
            }));
        } catch (err) {
            console.error('Failed to log time:', err);
        }
    },

    setActiveTask: (id) => set({ activeTaskId: id }),
    setSelectedDate: (date) => set({ selectedDate: date }),

    reorderTasks: (newOrder) => set({ tasks: newOrder }),
}));
