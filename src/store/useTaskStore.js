import { create } from 'zustand';
import { format, startOfDay } from 'date-fns';

const API_URL = '/api/tasks';

function calendarDayString(d) {
    return format(startOfDay(d), 'yyyy-MM-dd');
}

/** Normalize server stored instant to local calendar midnight for consistent ?date= YYYY-MM-DD */
function localDateFromStoredScheduled(stored) {
    const iso = typeof stored === 'string' ? stored : new Date(stored).toISOString();
    const [y, m, day] = iso.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, day);
}

export const useTaskStore = create((set, get) => ({
    tasks: [],
    selectedDate: new Date(),
    activeTaskId: null,
    isLoading: false,
    error: null,
    authToken: null,
    getToken: null,

    setAuthToken: (token) => set({ authToken: token }),
    setGetToken: (fn) => set({ getToken: fn }),

    fetchTasks: async (dateOverride) => {
        const tokenFn = get().getToken;
        const token = tokenFn ? await tokenFn() : get().authToken;
        if (!token) return;

        set({ isLoading: true });
        try {
            const day = calendarDayString(dateOverride ?? get().selectedDate);
            const url = `${API_URL}?date=${encodeURIComponent(day)}`;

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch tasks');
            const data = await response.json();
            set({ tasks: data, isLoading: false });
        } catch (err) {
            set({ error: err.message, isLoading: false });
        }
    },

    addTask: async (titleOrData, priority = 'medium', project = 'Inbox', estimatedTime = 0) => {
        const tokenFn = get().getToken;
        const token = tokenFn ? await tokenFn() : get().authToken;
        const dayStr = calendarDayString(get().selectedDate);

        try {
            let body;

            if (typeof titleOrData === 'object') {
                body = { ...titleOrData };
                if (!body.project) body.project = 'Inbox';
                if (body.scheduledDate == null || body.scheduledDate === '') {
                    body.scheduledDate = dayStr;
                }
            } else {
                body = {
                    title: titleOrData,
                    priority,
                    project,
                    estimatedTime,
                    scheduledDate: dayStr,
                };
            }

            delete body.createdAt;

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create task');
            }

            const created = await response.json();
            let refetchDate = get().selectedDate;
            if (created.scheduledDate) {
                refetchDate = localDateFromStoredScheduled(created.scheduledDate);
            }
            await get().fetchTasks(refetchDate);
        } catch (err) {
            console.error('Failed to add task:', err);
            throw err;
        }
    },

    updateTask: async (id, updates) => {
        const tokenFn = get().getToken;
        const token = tokenFn ? await tokenFn() : get().authToken;
        set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        }));

        try {
            const patchBody = { ...updates };
            if (patchBody.scheduledDate != null && typeof patchBody.scheduledDate !== 'string') {
                patchBody.scheduledDate = format(startOfDay(new Date(patchBody.scheduledDate)), 'yyyy-MM-dd');
            }

            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(patchBody),
            });
            const updatedTask = await response.json();
            set((state) => ({
                tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
            }));
        } catch (err) {
            console.error('Failed to update task:', err);
            get().fetchTasks();
        }
    },

    toggleTask: async (id) => {
        const tokenFn = get().getToken;
        const token = tokenFn ? await tokenFn() : get().authToken;
        const task = get().tasks.find((t) => t.id === id);
        if (!task) return;

        set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
        }));

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ completed: !task.completed }),
            });
            const updatedTask = await response.json();

            set((state) => ({
                tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
            }));
        } catch (err) {
            console.error('Failed to toggle task:', err);
            set((state) => ({
                tasks: state.tasks.map((t) => (t.id === id ? { ...t, completed: task.completed } : t)),
            }));
        }
    },

    deleteTask: async (id) => {
        const tokenFn = get().getToken;
        const token = tokenFn ? await tokenFn() : get().authToken;
        const previousTasks = get().tasks;
        set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
        }));

        try {
            await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (err) {
            console.error('Failed to delete task:', err);
            set({ tasks: previousTasks });
        }
    },

    logTime: async (id, duration) => {
        const tokenFn = get().getToken;
        const token = tokenFn ? await tokenFn() : get().authToken;
        try {
            await fetch(`${API_URL}/${id}/log-time`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ duration }),
            });

            set((state) => ({
                tasks: state.tasks.map((t) =>
                    t.id === id ? { ...t, timeSpent: (t.timeSpent || 0) + duration } : t
                ),
            }));
        } catch (err) {
            console.error('Failed to log time:', err);
        }
    },

    setActiveTask: (id) => set({ activeTaskId: id }),
    setSelectedDate: (date) => set({ selectedDate: date }),

    reorderTasks: (newOrder) => set({ tasks: newOrder }),
}));
