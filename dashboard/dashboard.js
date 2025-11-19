document.addEventListener('DOMContentLoaded', async () => {
    console.log('Dashboard loaded');

    // Initialize UI
    initializeTimeRangeSelector();
    initializeClearDataBtn();
    initializeExportBtn();
    updateStorageUsage();

    // Load initial data
    await loadDashboardData();
});

let allData = null;

function initializeTimeRangeSelector() {
    const selector = document.getElementById('timeRange');
    selector.addEventListener('change', () => {
        renderDashboard();
    });
}

function initializeExportBtn() {
    const btn = document.getElementById('exportBtn');
    btn.addEventListener('click', async () => {
        if (!allData) return;
        const dataStr = JSON.stringify(allData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chatgpt-token-stats-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

async function updateStorageUsage() {
    try {
        const bytes = await StorageUtils.getBytesInUse(null);
        const kb = (bytes / 1024).toFixed(2);
        const el = document.getElementById('storageUsage');
        if (el) el.textContent = `使用量: ${kb} KB`;
    } catch (e) {
        console.error('Error getting storage usage:', e);
    }
}

function initializeClearDataBtn() {
    const btn = document.getElementById('clearDataBtn');
    btn.addEventListener('click', async () => {
        if (confirm('确定要清空所有统计数据吗？此操作不可恢复。')) {
            await StorageUtils.clear();
            await StorageUtils.init(); // Re-init defaults
            location.reload();
        }
    });
}

async function loadDashboardData() {
    try {
        allData = await StorageUtils.get(null);
        renderDashboard();
    } catch (error) {
        console.error('Failed to load data:', error);
    }
}

function renderDashboard() {
    if (!allData || !allData.sessions) return;

    const timeRange = document.getElementById('timeRange').value;
    const filteredSessions = filterSessionsByTime(allData.sessions, timeRange);

    updateOverviewCards(filteredSessions);
    updateSessionTable(filteredSessions);
    updateModeStats(filteredSessions);
    updateDailyStatsTable(allData.dailyStats);
    updateCharts(filteredSessions, timeRange);
}

let chartInstance = null;

function updateCharts(sessions, range) {
    const ctx = document.getElementById('usageChart').getContext('2d');

    // Aggregate data based on range
    const labels = [];
    const dataPoints = [];

    // Group by date/hour
    const grouped = {};
    const now = Date.now();

    // Setup buckets
    if (range === '24h') {
        // Last 24 hours, bucket by hour
        for (let i = 23; i >= 0; i--) {
            const d = new Date(now - i * 60 * 60 * 1000);
            const key = `${d.getHours()}:00`;
            grouped[key] = 0;
            if (!labels.includes(key)) labels.push(key);
        }
    } else {
        // Last 7 or 30 days, bucket by day
        const days = range === '7d' ? 7 : 30;
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(now - i * 24 * 60 * 60 * 1000);
            const key = `${d.getMonth() + 1}/${d.getDate()}`;
            grouped[key] = 0;
            if (!labels.includes(key)) labels.push(key);
        }
    }

    // Fill buckets
    sessions.forEach(session => {
        const d = new Date(session.timestamp);
        let key;
        if (range === '24h') {
            key = `${d.getHours()}:00`;
        } else {
            key = `${d.getMonth() + 1}/${d.getDate()}`;
        }

        if (grouped[key] !== undefined) {
            grouped[key] += (session.totalTokens || 0);
        }
    });

    const data = labels.map(label => grouped[label]);

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Tokens',
                data: data,
                borderColor: '#10a37f',
                backgroundColor: 'rgba(16, 163, 127, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        display: true,
                        color: '#f0f0f0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function filterSessionsByTime(sessions, range) {
    const now = Date.now();
    let cutoff = 0;

    switch (range) {
        case '24h':
            cutoff = now - (24 * 60 * 60 * 1000);
            break;
        case '7d':
            cutoff = now - (7 * 24 * 60 * 60 * 1000);
            break;
        case '30d':
            cutoff = now - (30 * 24 * 60 * 60 * 1000);
            break;
        default:
            cutoff = 0;
    }

    return Object.values(sessions).filter(session => session.timestamp > cutoff);
}

function updateOverviewCards(sessions) {
    let totalTokens = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    let totalTurns = 0;

    sessions.forEach(session => {
        totalTokens += (session.totalTokens || 0);
        inputTokens += (session.inputTokens || 0);
        outputTokens += (session.outputTokens || 0);
        totalTurns += (session.turns || 0);
    });

    document.getElementById('totalTokens').textContent = formatNumber(totalTokens);
    document.getElementById('inputTokens').textContent = formatNumber(inputTokens);
    document.getElementById('outputTokens').textContent = formatNumber(outputTokens);
    document.getElementById('totalTurns').textContent = formatNumber(totalTurns);
}

function updateSessionTable(sessions) {
    const tbody = document.querySelector('#sessionsTable tbody');
    tbody.innerHTML = '';

    if (sessions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">在此期间暂无会话</td></tr>';
        return;
    }

    // Sort by timestamp desc
    const sortedSessions = sessions.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20); // Show top 20

    sortedSessions.forEach(session => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatDate(session.timestamp)}</td>
            <td>${session.mode || 'Default'}</td>
            <td>${session.turns || 0}</td>
            <td class="text-right">${formatNumber(session.totalTokens || 0)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function updateDailyStatsTable(dailyStats) {
    const tbody = document.querySelector('#dailyStatsTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!dailyStats || Object.keys(dailyStats).length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">暂无数据</td></tr>';
        return;
    }

    // Sort by date desc
    const sortedDates = Object.keys(dailyStats).sort((a, b) => new Date(b) - new Date(a));

    sortedDates.forEach(date => {
        const stats = dailyStats[date];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${date}</td>
            <td class="text-right">${formatNumber(stats.totalTokens || 0)}</td>
            <td class="text-right">${stats.turns || 0}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Auto-refresh when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        loadDashboardData();
    }
});

// Manual refresh button
const refreshBtn = document.getElementById('refreshBtn');
if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
        loadDashboardData();
        // Add a small visual feedback
        refreshBtn.classList.add('rotating');
        setTimeout(() => refreshBtn.classList.remove('rotating'), 500);
    });
}

function updateModeStats(sessions) {
    const modeStats = {};
    let totalTokens = 0;

    sessions.forEach(session => {
        const mode = session.mode || 'Default';
        if (!modeStats[mode]) {
            modeStats[mode] = { tokens: 0, count: 0 };
        }
        modeStats[mode].tokens += (session.totalTokens || 0);
        modeStats[mode].count++;
        totalTokens += (session.totalTokens || 0);
    });

    const container = document.getElementById('modeStatsList');
    container.innerHTML = '';

    if (Object.keys(modeStats).length === 0) {
        container.innerHTML = '<div class="empty-state">暂无数据</div>';
        return;
    }

    Object.entries(modeStats)
        .sort(([, a], [, b]) => b.tokens - a.tokens)
        .forEach(([mode, stats]) => {
            const percentage = totalTokens > 0 ? Math.round((stats.tokens / totalTokens) * 100) : 0;

            const div = document.createElement('div');
            div.className = 'mode-item';
            div.innerHTML = `
                <div class="mode-info">
                    <span class="mode-name">${mode}</span>
                    <span class="mode-count">${stats.count} 个会话 (${percentage}%)</span>
                </div>
                <div class="mode-value">${formatNumber(stats.tokens)}</div>
            `;
            container.appendChild(div);
        });
}

// Utilities
function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
