import { create } from 'zustand';
import { useTaskStore } from './useTaskStore'; // to get token

// Helper to get token
const getToken = () => useTaskStore.getState().authToken;

export const useMusicStore = create((set, get) => ({
    isPlaying: false,
    volume: 0.5,
    playlist: [], // Array of { _id, name, url, duration? }
    currentTrackIndex: 0,
    isLoading: false,

    // Actions
    fetchSongs: async () => {
        const token = getToken();
        if (!token) return;

        set({ isLoading: true });
        try {
            const response = await fetch('/api/music', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const songs = await response.json();
                // Map to playlist format
                const formattedSongs = songs.map(song => ({
                    id: song._id,
                    name: song.name,
                    url: `/api/music/${song._id}/audio`
                }));
                set({ playlist: formattedSongs, isLoading: false });
            }
        } catch (error) {
            console.error('Failed to fetch songs:', error);
            set({ isLoading: false });
        }
    },

    addTracks: async (files) => {
        const token = getToken();
        if (!token) return;

        set({ isLoading: true });
        const promises = Array.from(files).map(async (file) => {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/api/music', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                if (response.ok) {
                    const newSong = await response.json();
                    return {
                        id: newSong._id,
                        name: newSong.name,
                        url: `/api/music/${newSong._id}/audio`
                    };
                }
            } catch (error) {
                console.error('Upload failed for file:', file.name, error);
            }
            return null;
        });

        const results = await Promise.all(promises);
        const validSongs = results.filter(s => s !== null);

        set(state => ({
            playlist: [...state.playlist, ...validSongs],
            isLoading: false
        }));
    },

    removeTrack: async (id) => {
        const token = getToken();
        if (!token) return;

        // Optimistic update
        const previousPlaylist = get().playlist;
        const indexToRemove = previousPlaylist.findIndex(t => t.id === id);

        // Calculate new index
        let newIndex = get().currentTrackIndex;
        if (indexToRemove !== -1) {
            if (indexToRemove < newIndex) {
                newIndex -= 1;
            } else if (indexToRemove === newIndex) {
                newIndex = 0; // Reset or handle logic
            }
        }

        set(state => ({
            playlist: state.playlist.filter(t => t.id !== id),
            currentTrackIndex: newIndex,
            isPlaying: state.playlist.length > 1 ? state.isPlaying : false // Stop if empty
        }));

        try {
            await fetch(`/api/music/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Delete failed:', error);
            set({ playlist: previousPlaylist }); // Revert
        }
    },

    playTrack: (index) => set({ currentTrackIndex: index, isPlaying: true }),

    nextTrack: () => set((state) => {
        if (state.playlist.length === 0) return state;
        const nextIndex = (state.currentTrackIndex + 1) % state.playlist.length;
        return { currentTrackIndex: nextIndex, isPlaying: true };
    }),

    prevTrack: () => set((state) => {
        if (state.playlist.length === 0) return state;
        const prevIndex = (state.currentTrackIndex - 1 + state.playlist.length) % state.playlist.length;
        return { currentTrackIndex: prevIndex, isPlaying: true };
    }),

    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setVolume: (volume) => set({ volume }),

    // Start Time State
    currentTime: 0,
    duration: 0,
    seekTime: null,

    setCurrentTime: (time) => set({ currentTime: time }),
    setDuration: (duration) => set({ duration }),
    seekTo: (time) => set({ seekTime: time, currentTime: time }),
}));
