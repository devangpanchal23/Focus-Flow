import { useCallback, useEffect, useRef } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { createDebounced, patchUserState } from '../utils/userStateSync';

/**
 * After preferences are hydrated from the server, pushes theme/sound/volume changes to MongoDB.
 */
export function useSyncSettingsToMongo(getToken, enabled) {
    const readyRef = useRef(false);

    useEffect(() => {
        if (!enabled) return undefined;
        const debouncedPatch = createDebounced(() => {
            if (!readyRef.current) return;
            const state = useSettingsStore.getState();
            patchUserState(getToken, {
                preferences: {
                    theme: state.theme,
                    soundEnabled: state.soundEnabled,
                    volume: state.volume,
                },
            });
        }, 1400);

        const unsub = useSettingsStore.subscribe(() => debouncedPatch());

        return () => unsub();
    }, [getToken, enabled]);

    const markPreferencesHydrated = useCallback(() => {
        readyRef.current = true;
    }, []);

    return { markPreferencesHydrated };
}
