const RAW_API_URL = import.meta.env.VITE_API_URL || '';

const API_BASE_URL = RAW_API_URL.endsWith('/')
    ? RAW_API_URL.slice(0, -1)
    : RAW_API_URL;

export function apiUrl(path) {
    if (!path) return API_BASE_URL;
    const safePath = path.startsWith('/') ? path : `/${path}`;
    return API_BASE_URL ? `${API_BASE_URL}${safePath}` : safePath;
}

