console.log('ChatGPT Token Monitor: Content Script Initialized');

// Configuration
const DEBOUNCE_DELAY = 1000; // ms to wait after DOM changes before processing
const CHARS_PER_TOKEN_ESTIMATE = 4; // Rough estimate

// State
let currentSessionId = getSessionIdFromUrl(window.location.href);
let isProcessing = false;
let debounceTimer = null;
let lastUrl = window.location.href;

// Selectors
const SELECTORS = {
    // These selectors are based on common ChatGPT DOM structures.
    MESSAGE_ROW: '[data-message-author-role]', // The container for a message
    AUTHOR_ROLE: 'data-message-author-role', // Attribute name
    MESSAGE_CONTENT: '.markdown', // The text content container
    // Fallback for user messages which might not have .markdown class sometimes
    USER_MESSAGE_CONTENT: 'div.whitespace-pre-wrap',
    // Model selector (this is tricky and changes often, we'll try a few common ones)
    MODEL_SELECTOR: '[data-testid^="model-selector"]',
    MODEL_NAME: '.text-token-text-secondary', // Sometimes the model name is here
};

/**
 * Helper to get session ID from URL
 */
function getSessionIdFromUrl(url) {
    try {
        const urlObj = new URL(url);
        // Path is usually /c/UUID or just /
        const pathParts = urlObj.pathname.split('/');
        const cIndex = pathParts.indexOf('c');
        if (cIndex !== -1 && pathParts[cIndex + 1]) {
            return pathParts[cIndex + 1];
        }
        return 'default'; // For the main landing page or unsaved chats
    } catch (e) {
        console.error('Error parsing URL:', e);
        return 'unknown';
    }
}

/**
 * Detect the current ChatGPT mode/model
 */
function detectMode() {
    // 1. Try to find it in the URL (sometimes ?model=gpt-4)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('model')) {
        return urlParams.get('model');
    }

    // 2. Try to find it in the UI
    // This is brittle. For V1, we might default to "Auto" or "Unknown" if not found.
    const modelElement = document.querySelector(SELECTORS.MODEL_SELECTOR);
    if (modelElement) {
        return modelElement.textContent || 'Unknown';
    }

    // 3. Check for specific elements that might indicate model
    // e.g. "Thinking" badge
    if (document.body.innerText.includes('Thinking...')) {
        return 'o1-preview'; // Guess
    }

    return 'Default';
}

/**
 * Estimate tokens from text length
 */
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

/**
 * Extract text from a message element
 */
function extractText(element) {
    // Clone to avoid modifying the DOM
    const clone = element.cloneNode(true);
    // Remove code blocks headers or other non-content UI if necessary
    // For V1, simple textContent is a good start
    return clone.textContent || '';
}

/**
 * Main function to scan the DOM and update statistics
 */
async function scanAndProcessMessages() {
    if (isProcessing) return;
    isProcessing = true;

    try {
        // Check if URL changed (SPA navigation)
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            currentSessionId = getSessionIdFromUrl(lastUrl);
            console.log('URL changed, new session ID:', currentSessionId);
        }

        const messageElements = document.querySelectorAll(SELECTORS.MESSAGE_ROW);

        if (messageElements.length === 0) {
            isProcessing = false;
            return;
        }

        let sessionInputTokens = 0;
        let sessionOutputTokens = 0;
        let sessionTurns = 0;
        let messagesData = [];

        // Iterate through all messages in the DOM
        messageElements.forEach((el, index) => {
            const role = el.getAttribute(SELECTORS.AUTHOR_ROLE);

            // Find content container
            let contentEl = el.querySelector(SELECTORS.MESSAGE_CONTENT);
            if (!contentEl && role === 'user') {
                contentEl = el.querySelector(SELECTORS.USER_MESSAGE_CONTENT);
            }

            if (contentEl) {
                const text = extractText(contentEl);
                const tokens = estimateTokens(text);

                if (role === 'user') {
                    sessionInputTokens += tokens;
                } else if (role === 'assistant') {
                    sessionOutputTokens += tokens;
                }

                messagesData.push({
                    index,
                    role,
                    length: text.length,
                    tokens
                });
            }
        });

        // Calculate turns (User + AI pair)
        sessionTurns = messagesData.filter(m => m.role === 'assistant').length;

        const sessionTotalTokens = sessionInputTokens + sessionOutputTokens;
        const currentMode = detectMode();

        // Save session data
        const sessionData = {
            id: currentSessionId,
            timestamp: Date.now(),
            inputTokens: sessionInputTokens,
            outputTokens: sessionOutputTokens,
            totalTokens: sessionTotalTokens,
            turns: sessionTurns,
            messageCount: messagesData.length,
            mode: currentMode,
            lastUpdated: Date.now()
        };

        // Update local storage
        await updateStats(sessionData);

    } catch (error) {
        console.error('Error processing messages:', error);
    } finally {
        isProcessing = false;
    }
}

/**
 * Update global and session stats in storage
 */
async function updateStats(currentSessionData) {
    try {
        // Get existing data
        const data = await StorageUtils.get(['sessions', 'globalStats', 'modeStats', 'dailyStats']);

        let sessions = data.sessions || {};
        let globalStats = data.globalStats || {
            totalTokens: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalTurns: 0
        };
        let modeStats = data.modeStats || {};

        // Calculate difference to add to global stats
        const previousSessionData = sessions[currentSessionData.id] || {
            inputTokens: 0,
            outputTokens: 0,
            turns: 0,
            mode: 'Default'
        };

        const inputDelta = currentSessionData.inputTokens - previousSessionData.inputTokens;
        const outputDelta = currentSessionData.outputTokens - previousSessionData.outputTokens;
        const turnsDelta = currentSessionData.turns - previousSessionData.turns;

        // Update global stats
        globalStats.inputTokens += inputDelta;
        globalStats.outputTokens += outputDelta;
        globalStats.totalTokens += (inputDelta + outputDelta);
        globalStats.totalTurns += turnsDelta;

        // Update mode stats
        const mode = currentSessionData.mode;
        if (!modeStats[mode]) {
            modeStats[mode] = { totalTokens: 0, turns: 0 };
        }
        modeStats[mode].totalTokens += (inputDelta + outputDelta);
        modeStats[mode].turns += turnsDelta;

        // Update daily stats
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        let dailyStats = data.dailyStats || {};
        if (!dailyStats[today]) {
            dailyStats[today] = {
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                turns: 0
            };
        }
        dailyStats[today].inputTokens += inputDelta;
        dailyStats[today].outputTokens += outputDelta;
        dailyStats[today].totalTokens += (inputDelta + outputDelta);
        dailyStats[today].turns += turnsDelta;

        // Update session in map
        sessions[currentSessionData.id] = currentSessionData;

        // Save back
        await StorageUtils.set({
            sessions,
            globalStats,
            modeStats,
            dailyStats,
            todayTokens: globalStats.totalTokens
        });

        console.log('Stats updated:', { globalStats, modeStats });

    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Debounce wrapper
function debouncedScan() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scanAndProcessMessages, DEBOUNCE_DELAY);
}

// Setup MutationObserver
const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
            shouldScan = true;
            break;
        }
    }

    if (shouldScan) {
        debouncedScan();
    }
});

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});

// Initial scan
setTimeout(scanAndProcessMessages, 2000);
