const KEY = 'blitz_user_ui_snapshot';

/** Session snapshot written after /api/users/me so late-mounted widgets can hydrate. */
export function readUiSnapshot() {
    try {
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return null;
        const o = JSON.parse(raw);
        return o && typeof o === 'object' ? o : null;
    } catch {
        return null;
    }
}

export function writeUiSnapshot(payload) {
    try {
        sessionStorage.setItem(KEY, JSON.stringify(payload));
    } catch (_) {
        /* ignore quota / disabled */
    }
}

export function clearUiSnapshot() {
    try {
        sessionStorage.removeItem(KEY);
    } catch (_) {
        /* ignore */
    }
}
