// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    
    // Set default settings
    chrome.storage.local.set({
        lastUsedUrl: '',
        lastAnalysis: ''
    });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSettings') {
        chrome.storage.local.get(['lastUsedUrl', 'lastAnalysis'], (result) => {
            sendResponse(result);
        });
        return true; // Will respond asynchronously
    }
});