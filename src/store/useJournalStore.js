import { create } from 'zustand';
import { apiUrl } from '../lib/api';

// API Configuration
const API_URL = apiUrl('/api/journal');

async function safeJson(response) {
    const text = await response.text();
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

export const useJournalStore = create((set, get) => ({
    entries: [],
    isLoading: false,
    error: null,
    authToken: null,
    getToken: null,

    setAuthToken: (token) => set({ authToken: token }),
    setGetToken: (fn) => set({ getToken: fn }),

    // Fetch all journal history headers (date + snippet)
    fetchHistory: async () => {
        const tokenFn = get().getToken;
        const token = tokenFn ? await tokenFn() : get().authToken;
        if (!token) return; // Silent return if no token

        try {
            const res = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await safeJson(res);
                set({ entries: data });
            } else {
                const err = await safeJson(res);
                set({ error: err?.message || 'Failed to load journal history' });
            }
        } catch (error) {
            console.error("Failed to fetch journal history:", error);
            set({ error: error.message || 'Failed to load journal history' });
        }
    },

    // Save a journal entry
    saveEntry: async (date, content) => {
        const tokenFn = get().getToken;
        const token = tokenFn ? await tokenFn() : get().authToken;
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
                const errData = await safeJson(res);
                throw new Error(errData?.message || 'Failed to save');
            }

            // Refresh history to ensure snippets are up to date
            get().fetchHistory();
            set({ isLoading: false, error: null });
            return true;
        } catch (error) {
            set({ isLoading: false, error: error.message });
            throw error;
        }
    },

    // Fetch a single entry content
    fetchEntryContent: async (date) => {
        const tokenFn = get().getToken;
        const token = tokenFn ? await tokenFn() : get().authToken;
        if (!token) return '';

        set({ isLoading: true });
        try {
            const res = await fetch(`${API_URL}/${date}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            set({ isLoading: false });
            if (res.ok) {
                const data = await safeJson(res);
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
