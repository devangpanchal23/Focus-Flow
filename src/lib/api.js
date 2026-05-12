const RAW_API_URL = import.meta.env.VITE_API_URL || '';

const API_BASE_URL = RAW_API_URL.endsWith('/')
    ? RAW_API_URL.slice(0, -1)
    : RAW_API_URL;

export function apiUrl(path) {
    if (!path) return API_BASE_URL || '';
    const safePath = path.startsWith('/') ? path : `/${path}`;

    if (!API_BASE_URL) return safePath;

    // Avoid accidental /api/api/... when base already ends with /api.
    if (API_BASE_URL.endsWith('/api') && safePath.startsWith('/api/')) {
        return `${API_BASE_URL}${safePath.slice(4)}`;
    }

    return `${API_BASE_URL}${safePath}`;
}

