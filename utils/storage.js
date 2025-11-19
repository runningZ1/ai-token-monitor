/**
 * Storage utility for ChatGPT Token Monitor
 * Handles all interactions with chrome.storage.local
 */

const Storage = {
    /**
     * Save data to storage
     * @param {Object} data - Key-value pairs to save
     * @returns {Promise<void>}
     */
    set: (data) => {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set(data, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    },

    /**
     * Get data from storage
     * @param {string|string[]|Object|null} keys - Keys to retrieve
     * @returns {Promise<Object>}
     */
    get: (keys) => {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(result);
                }
            });
        });
    },

    /**
     * Remove data from storage
     * @param {string|string[]} keys - Keys to remove
     * @returns {Promise<void>}
     */
    remove: (keys) => {
        return new Promise((resolve, reject) => {
            chrome.storage.local.remove(keys, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    },

    /**
     * Clear all data from storage
     * @returns {Promise<void>}
     */
    clear: () => {
        return new Promise((resolve, reject) => {
            chrome.storage.local.clear(() => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    },

    /**
     * Get current storage usage in bytes
     * @returns {Promise<number>}
     */
    getBytesInUse: (keys = null) => {
        return new Promise((resolve, reject) => {
            chrome.storage.local.getBytesInUse(keys, (bytes) => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve(bytes);
                }
            });
        });
    },

    /**
     * Initialize storage with default schema and run migrations
     */
    init: async () => {
        const CURRENT_VERSION = 1;
        const defaults = {
            version: CURRENT_VERSION,
            globalStats: {
                totalTokens: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalTurns: 0
            },
            modeStats: {},
            dailyStats: {},
            sessions: {},
            todayTokens: 0
        };

        try {
            const data = await Storage.get(null); // Get everything

            // If empty, set defaults
            if (Object.keys(data).length === 0) {
                await Storage.set(defaults);
                console.log('Storage initialized with defaults');
                return;
            }

            // Check version and migrate if needed
            if (!data.version) {
                // Pre-versioning data (if any), set version 1
                await Storage.set({ version: 1 });
            } else if (data.version < CURRENT_VERSION) {
                console.log(`Migrating from version ${data.version} to ${CURRENT_VERSION}`);
                // Implement migration logic here when needed
                await Storage.set({ version: CURRENT_VERSION });
            }

        } catch (error) {
            console.error('Storage initialization error:', error);
        }
    }
};

// Export for use in modules (if using ES modules) or global scope
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
} else {
    window.StorageUtils = Storage;
}
