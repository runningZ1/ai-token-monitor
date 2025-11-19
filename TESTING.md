# ChatGPT Token Monitor - Testing Guide

This guide provides instructions for manually testing the "ChatGPT Token Monitor" Chrome extension to ensure all features work as expected.

## 1. Installation

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** in the top right corner.
3.  Click **Load unpacked**.
4.  Select the `ai-token-monitor` directory.
5.  Verify that the extension icon appears in the toolbar.

## 2. Core Functionality Test

### 2.1. Message Monitoring
1.  Open [ChatGPT](https://chatgpt.com/).
2.  Start a new chat or open an existing one.
3.  Type a message (e.g., "Hello, how are you?") and send it.
4.  Wait for the AI to respond.
5.  **Verify**: The extension icon should not show any errors. (In V1, the icon is static, but you can check the console for logs if needed).

### 2.2. Dashboard Data Update
1.  Click the extension icon in the toolbar.
2.  Click **"打开统计看板" (Open Dashboard)**.
3.  **Verify**:
    -   The dashboard opens in a new tab.
    -   The **"总 Token" (Total Tokens)** count has increased.
    -   The **"近期会话" (Recent Sessions)** table shows a new entry with the current time.
    -   The **"对话轮数" (Turns)** count is correct (1 turn = 1 user message + 1 AI response).

### 2.3. Mode Detection
1.  In ChatGPT, switch to a different model if available (e.g., GPT-4o vs GPT-3.5).
2.  Send a message.
3.  Refresh the Dashboard.
4.  **Verify**:
    -   The **"模式分布" (Mode Stats)** section shows the correct model name (e.g., "GPT-4", "Default").
    -   The session in the table reflects the correct mode.

### 2.4. Daily Statistics (New)
1.  Check the **"每日统计" (Daily Stats)** table in the left column of the dashboard.
2.  **Verify**:
    -   There is a row for the current date (YYYY-MM-DD).
    -   The token count and turns match your activity for today.

### 2.5. Auto-refresh (New)
1.  Keep the Dashboard open in one tab.
2.  Go back to the ChatGPT tab and send another message.
3.  Switch back to the Dashboard tab (do NOT manually refresh the page).
4.  **Verify**:
    -   The numbers (Total Tokens, etc.) update automatically within a few seconds.
    -   The "Recent Sessions" list updates with the new interaction.

## 3. Dashboard Features Test

### 3.1. Time Range Filtering
1.  In the dashboard, change the dropdown from **"最近 7 天" (Last 7 Days)** to **"最近 24 小时" (Last 24 Hours)**.
2.  **Verify**: The charts and stats update to reflect only recent data.
3.  Change to **"最近 30 天" (Last 30 Days)**.
4.  **Verify**: The view updates accordingly.

### 3.2. Data Management
1.  **Export**: Click **"导出数据 (JSON)"**.
    -   **Verify**: A `.json` file is downloaded containing your session data.
2.  **Clear Data**: Click **"清空所有数据"**.
    -   Confirm the dialog.
    -   **Verify**: All stats reset to 0, and the session table is empty.

## 4. Privacy & Storage Test

1.  **Storage Usage**: Check the "使用量" (Usage) text next to the "数据管理" (Data Management) header.
    -   **Verify**: It shows a value (e.g., "0.5 KB").
2.  **Network Check** (Advanced):
    -   Open Chrome DevTools (F12) -> Network tab.
    -   Interact with ChatGPT.
    -   **Verify**: No requests are sent to any third-party servers by the extension (only ChatGPT's own requests).

## 5. Troubleshooting

-   **Stats not updating?**
    -   Try refreshing the ChatGPT page.
    -   Ensure the URL is `chatgpt.com`.
    -   Check if ChatGPT has changed its UI (DOM selectors might need updating).
-   **Extension error?**
    -   Go to `chrome://extensions/`, find the extension, and click "Errors" to see logs.
