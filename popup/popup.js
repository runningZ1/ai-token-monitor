document.addEventListener('DOMContentLoaded', () => {
    const openDashboardBtn = document.getElementById('openDashboard');

    openDashboardBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'openDashboard' });
    });

    // TODO: Load actual stats from storage
    chrome.storage.local.get(['todayTokens'], (result) => {
        if (result.todayTokens) {
            document.getElementById('todayTokens').textContent = result.todayTokens;
        }
    });
});
