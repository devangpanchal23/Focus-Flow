function normalizeDomain(input) {
    if (!input || typeof input !== 'string') return '';
    let value = input.trim().toLowerCase();
    value = value.replace(/^https?:\/\//, '');
    value = value.replace(/^www\./, '');
    value = value.split('/')[0];
    value = value.split('?')[0];
    value = value.split('#')[0];
    return value;
}

async function applyRulesForDomains(rawDomains) {
    const domains = Array.from(
        new Set((rawDomains || []).map(normalizeDomain).filter(Boolean))
    );

    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = oldRules.map((rule) => rule.id);

    const addRules = domains.map((domain, index) => ({
        id: index + 1,
        priority: 1,
        action: {
            type: 'redirect',
            redirect: { extensionPath: '/blocked.html' },
        },
        condition: {
            // ||domain blocks root + subdomains on both http/https
            urlFilter: `||${domain}`,
            resourceTypes: ['main_frame'],
        },
    }));

    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules,
    });

    await chrome.storage.local.set({ blockedDomains: domains });
}

async function applyRulesFromStorage() {
    const { blockedDomains = [] } = await chrome.storage.local.get(['blockedDomains']);
    await applyRulesForDomains(blockedDomains);
}

chrome.runtime.onInstalled.addListener(() => {
    applyRulesFromStorage().catch((err) => {
        console.error('Failed to apply rules on install:', err);
    });
});

chrome.runtime.onStartup.addListener(() => {
    applyRulesFromStorage().catch((err) => {
        console.error('Failed to apply rules on startup:', err);
    });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'UPDATE_BLOCK_LIST') return;
    const domains = Array.isArray(message.sites)
        ? message.sites.map((site) => site?.domain)
        : [];
    applyRulesForDomains(domains)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => {
            console.error('Failed to update rules from message:', err);
            sendResponse({ ok: false, error: String(err?.message || err) });
        });
    return true;
});
