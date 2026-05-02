/** PATCH /api/users/state with auth (non-throwing helper) */
export async function patchUserState(getToken, body) {
    try {
        const token = typeof getToken === 'function' ? await getToken() : getToken;
        if (!token) return false;
        const res = await fetch('/api/users/state', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body || {}),
        });
        return res.ok;
    } catch (e) {
        console.warn('patchUserState failed', e);
        return false;
    }
}

/** Log app session / open for MongoDB auditing */
export async function logAppSession(getToken, payload = {}) {
    try {
        const token = typeof getToken === 'function' ? await getToken() : getToken;
        if (!token) return;
        await fetch('/api/users/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ event: 'APP_OPEN', payload }),
        });
    } catch (_) {
        /* ignore */
    }
}

export function createDebounced(fn, delay = 1200) {
    let id;
    return (...args) => {
        clearTimeout(id);
        id = setTimeout(() => fn(...args), delay);
    };
}
