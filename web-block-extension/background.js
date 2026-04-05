chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'UPDATE_BLOCK_LIST') {
        updateBlockingRules(message.sites);
    }
});

async function updateBlockingRules(sites) {
    if (!sites || !Array.isArray(sites)) return;

    const domains = sites.map(s => s.domain).filter(Boolean);
    console.log('Updating blocking rules for:', domains);

    // Get existing rules to clean up
    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    const oldRuleIds = oldRules.map(rule => rule.id);

    // Create new rules
    const newRules = domains.map((domain, index) => ({
        id: index + 1,
        priority: 1,
        action: {
            type: "redirect",
            redirect: { extensionPath: "/blocked.html" }
        },
        condition: {
            urlFilter: "||" + domain,
            resourceTypes: ["main_frame"]
        }
    }));

    // Perform update
    await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: oldRuleIds,
        addRules: newRules
    });

    // Save to storage for persistence locally in extension (optional but good)
    chrome.storage.local.set({ blockedDomains: domains });
}
