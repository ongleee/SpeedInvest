// ────────────────────────────────────────────────────────────────────
// MV3 Service Worker — handles background tasks and message routing
// ────────────────────────────────────────────────────────────────────

// Enable side panel to open on action button click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error("[SpeedInvest] Error setting panel behavior:", error));

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    console.log("[SpeedInvest] Extension installed. Backend: http://localhost:3000");
  }
});

// Forward messages from content scripts to popup if needed
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ type: "PONG", version: chrome.runtime.getManifest().version });
  }
  return true; // Keep message channel open for async responses
});
