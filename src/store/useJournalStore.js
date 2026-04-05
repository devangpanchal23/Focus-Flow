import { create } from 'zustand';

// API Configuration
const API_URL = '/api/journal';

export const useJournalStore = create((set, get) => ({
    entries: [],
    isLoading: false,
    error: null,
    authToken: null,

    setAuthToken: (token) => set({ authToken: token }),

    // Fetch all journal history headers (date + snippet)
    fetchHistory: async () => {
        const token = get().authToken;
        if (!token) return; // Silent return if no token

        try {
            const res = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                set({ entries: data });
            }
        } catch (error) {
            console.error("Failed to fetch journal history:", error);
            // Don't set error state globally here to avoid UI clutter, just log it
        }
    },

    // Save a journal entry
    saveEntry: async (date, content) => {
        const token = get().authToken;
        if (!token) throw new Error('You must be logged in to save.');

        set({ isLoading: true });
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ date, content })
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Failed to save');
            }

            // Refresh history to ensure snippets are up to date
            get().fetchHistory();
            set({ isLoading: false });
            return true;
        } catch (error) {
            set({ isLoading: false, error: error.message });
            throw error;
        }
    },

    // Fetch a single entry content
    fetchEntryContent: async (date) => {
        const token = get().authToken;
        if (!token) return '';

        set({ isLoading: true });
        try {
            const res = await fetch(`${API_URL}/${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            set({ isLoading: false });
            if (res.ok) {
                const data = await res.json();
                return data.content || '';
            }
            return '';
        } catch (error) {
            console.error("Failed to fetch entry:", error);
            set({ isLoading: false });
            return '';
        }
    }
}));
