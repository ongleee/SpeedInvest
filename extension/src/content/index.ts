// ──────────────────────────────────────────────────────────────────────
// Content script — auto-detects ticker symbol on financial pages
// and injects a floating "Analyze" button for quick access
// ──────────────────────────────────────────────────────────────────────

const TICKER_PATTERNS: Record<string, () => string | null> = {
  "finance.yahoo.com": () => {
    // Yahoo Finance URL: /quote/AAPL/
    const match = window.location.pathname.match(/\/quote\/([^/]+)/);
    return match ? match[1] : null;
  },
  "stockanalysis.com": () => {
    // StockAnalysis URL: /stocks/AAPL/
    const match = window.location.pathname.match(/\/stocks\/([^/]+)/);
    return match ? match[1].toUpperCase() : null;
  },
};

function detectTicker(): string | null {
  const hostname = window.location.hostname.replace("www.", "");
  const extractor = TICKER_PATTERNS[hostname];
  return extractor ? extractor() : null;
}

function injectAnalyzeButton(ticker: string): void {
  const existing = document.getElementById("speedinvest-btn");
  if (existing) return;

  const btn = document.createElement("button");
  btn.id = "speedinvest-btn";
  btn.textContent = `⚡ AI Analyze ${ticker}`;
  btn.setAttribute("aria-label", `Analyze ${ticker} with SpeedInvest AI`);

  Object.assign(btn.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "999999",
    padding: "10px 18px",
    borderRadius: "8px",
    border: "1px solid rgba(0,255,136,0.4)",
    background: "rgba(10,10,15,0.92)",
    color: "#00ff88",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    backdropFilter: "blur(12px)",
    boxShadow: "0 0 20px rgba(0,255,136,0.15)",
    transition: "all 0.2s ease",
  });

  btn.addEventListener("mouseenter", () => {
    btn.style.background = "rgba(0,255,136,0.12)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "rgba(10,10,15,0.92)";
  });

  btn.addEventListener("click", () => {
    // Store detected ticker and open popup
    chrome.storage.session.set({ detectedTicker: ticker }, () => {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
    });
  });

  document.body.appendChild(btn);
}

// Run on page load
const ticker = detectTicker();
if (ticker) {
  injectAnalyzeButton(ticker);
}
