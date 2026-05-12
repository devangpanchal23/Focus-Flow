import { create } from 'zustand';
import { apiUrl } from '../lib/api';

const API_URL = apiUrl('/api/notes');

async function safeJson(response) {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

export const useNoteStore = create((set, get) => ({
    notes: [],
    isLoading: false,
    error: null,
    authToken: null,
    getToken: null,

    setAuthToken: (token) => set({ authToken: token }),
    setGetToken: (fn) => set({ getToken: fn }),

    fetchNotes: async () => {
        const tokenFn = get().getToken;
        const token = tokenFn ? await tokenFn() : get().authToken;
        if (!token) return;

        set({ isLoading: true });
        try {
            const response = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const err = await safeJson(response);
                throw new Error(err?.message || 'Failed to fetch notes');
            }
            const data = await safeJson(response);
            set({ notes: Array.isArray(data) ? data : [], error: null, isLoading: false });
        } catch (err) {
            set({ error: err.message, isLoading: false });
        }
    },

    addNote: async (noteData) => {
        const tokenFn = get().getToken;
        const token = tokenFn ? await tokenFn() : get().authToken;
        if (!token) throw new Error('Authentication token missing');
        try {
            const body = {
                ...noteData,
                createdAt: new Date()
            };

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await safeJson(response);
                throw new Error(errorData?.message || 'Failed to create note');
            }

            const newNote = await safeJson(response);
            set((state) => ({ notes: [newNote, ...state.notes] }));
            set({ error: null });
        } catch (err) {
            console.error('Failed to add note:', err);
            throw err;
        }
    },

    updateNote: async (id, updates) => {
        const tokenFn = get().getToken;
        const token = tokenFn ? await tokenFn() : get().authToken;
        // Optimistic update
        set((state) => ({
            notes: state.notes.map((n) => (n.id === id || n._id === id) ? { ...n, ...updates } : n)
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

            if (!response.ok) {
                const errorData = await safeJson(response);
                throw new Error(errorData?.message || 'Failed to update note');
            }

            const updatedNote = await safeJson(response);
            // Sync with server response
            set((state) => ({
                notes: state.notes.map((n) => (n.id === id || n._id === id) ? updatedNote : n)
            }));
            set({ error: null });
        } catch (err) {
            console.error('Failed to update note:', err);
            get().fetchNotes();
        }
    },

    deleteNote: async (id) => {
        const tokenFn = get().getToken;
        const token = tokenFn ? await tokenFn() : get().authToken;
        // Optimistic update
        const previousNotes = get().notes;
        set((state) => ({
            notes: state.notes.filter((n) => (n.id !== id && n._id !== id))
        }));

        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await safeJson(response);
                throw new Error(errorData?.message || 'Failed to delete note');
            }
        } catch (err) {
            console.error('Failed to delete note:', err);
            set({ notes: previousNotes });
        }
    }
}));
