chrome.storage.local.get(['blockedDomains'], (result) => {
    const domains = result.blockedDomains || [];
    const statusDiv = document.getElementById('status');
    statusDiv.innerHTML = `
        <strong>Active</strong><br>
        Currently blocking ${domains.length} website(s).
    `;
});
