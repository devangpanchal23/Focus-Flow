console.log('BlitzIt Content Script Loaded');

function toSitePayload(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => (typeof item === 'string' ? { domain: item } : item))
        .filter((item) => typeof item?.domain === 'string' && item.domain.trim() !== '');
}

// Listen for messages from the Main World (React App)
window.addEventListener('message', (event) => {
    // Security: We only accept messages from the same window
    if (event.source !== window) return;

    if (event.data.type === 'BLITZIT_BLOCK_UPDATE') {
        const sites = toSitePayload(event.data.sites);
        console.log('Content script received block update via postMessage:', sites);
        chrome.runtime.sendMessage({ type: 'UPDATE_BLOCK_LIST', sites });
    }
});

// Check for existing data in localStorage on initial load
try {
    const stored = localStorage.getItem('blitzit_blocked_sites');
    if (stored) {
        const sites = toSitePayload(JSON.parse(stored));
        console.log('Found stored sites in localStorage, syncing...', sites);
        chrome.runtime.sendMessage({ type: 'UPDATE_BLOCK_LIST', sites });
    }
} catch (e) {
    console.error('Error reading localStorage in content script:', e);
}
