import { create } from 'zustand';

const API_URL = '/api/notes';

export const useNoteStore = create((set, get) => ({
    notes: [],
    isLoading: false,
    error: null,
    authToken: null,

    setAuthToken: (token) => set({ authToken: token }),

    fetchNotes: async () => {
        const token = get().authToken;
        if (!token) return;

        set({ isLoading: true });
        try {
            const response = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch notes');
            const data = await response.json();
            set({ notes: data, isLoading: false });
        } catch (err) {
            set({ error: err.message, isLoading: false });
        }
    },

    addNote: async (noteData) => {
        const token = get().authToken;
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
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create note');
            }

            const newNote = await response.json();
            set((state) => ({ notes: [newNote, ...state.notes] }));
        } catch (err) {
            console.error('Failed to add note:', err);
            throw err;
        }
    },

    updateNote: async (id, updates) => {
        const token = get().authToken;
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

            if (!response.ok) throw new Error('Failed to update note');

            const updatedNote = await response.json();
            // Sync with server response
            set((state) => ({
                notes: state.notes.map((n) => (n.id === id || n._id === id) ? updatedNote : n)
            }));
        } catch (err) {
            console.error('Failed to update note:', err);
            get().fetchNotes();
        }
    },

    deleteNote: async (id) => {
        const token = get().authToken;
        // Optimistic update
        const previousNotes = get().notes;
        set((state) => ({
            notes: state.notes.filter((n) => (n.id !== id && n._id !== id))
        }));

        try {
            await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Failed to delete note:', err);
            set({ notes: previousNotes });
        }
    }
}));
