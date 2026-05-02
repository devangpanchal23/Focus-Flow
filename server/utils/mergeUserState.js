export function mergePreferences(current, incoming) {
    if (!incoming || typeof incoming !== 'object') return current || {};
    return {
        ...(current || {}),
        ...(incoming.theme != null ? { theme: incoming.theme } : {}),
        ...(incoming.soundEnabled != null ? { soundEnabled: incoming.soundEnabled } : {}),
        ...(incoming.volume != null ? { volume: Number(incoming.volume) } : {}),
    };
}

export function mergeUiState(current, incoming) {
    if (!incoming || typeof incoming !== 'object') return current || {};
    const c =
        current && typeof current.toObject === 'function'
            ? current.toObject()
            : { ...(current || {}) };
    const keys = ['sidebarOrder', 'lastActiveTab', 'focusSession', 'youtubeMusic'];
    const out = { ...c };
    for (const key of keys) {
        if (!(key in incoming)) continue;
        const val = incoming[key];
        if (key === 'sidebarOrder' && Array.isArray(val)) {
            out.sidebarOrder = val.filter((x) => typeof x === 'string');
        } else if ((key === 'focusSession' || key === 'youtubeMusic') && val && typeof val === 'object') {
            out[key] = { ...(c[key] || {}), ...val };
        } else if (key === 'lastActiveTab' && typeof val === 'string') {
            out.lastActiveTab = val.slice(0, 80);
        }
    }
    return out;
}
