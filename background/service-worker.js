// Background service worker

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('ChatGPT Token Monitor installed');
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openDashboard') {
        chrome.tabs.create({ url: 'dashboard/dashboard.html' });
    }
});
