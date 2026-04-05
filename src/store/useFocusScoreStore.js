import { create } from 'zustand';

export const useFocusScoreStore = create((set, get) => ({
    scoreData: null,
    isLoading: false,
    error: null,

    fetchScore: async (date) => {
        set({ isLoading: true });
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                set({ isLoading: false });
                return;
            }

            const query = date ? `?date=${date}` : '';
            const res = await fetch(`/api/focus-score${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Failed to fetch score');
            const data = await res.json();

            set({ scoreData: data, isLoading: false, error: null });
        } catch (error) {
            console.error(error);
            set({ error: error.message, isLoading: false });
        }
    }
}));
