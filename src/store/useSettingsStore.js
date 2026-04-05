import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
    persist(
        (set) => ({
            theme: 'light', // 'light' | 'dark'
            soundEnabled: true,
            volume: 0.5,

            toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
            toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
            setVolume: (volume) => set({ volume }),
        }),
        {
            name: 'settings-storage', // name of the item in the storage (must be unique)
        }
    )
);
