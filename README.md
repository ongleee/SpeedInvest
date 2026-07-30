# SpeedInvest — AI-Powered Penny Stock Analyzer

A monorepo containing a Chrome Extension and a Next.js backend that uses an Agentic AI Workflow to analyze highly volatile, low-cap stocks in real-time.

## Architecture Overview

```
speedinvest/
├── extension/        # React + TypeScript + Tailwind Chrome Extension (MV3)
└── web-backend/      # Next.js App Router API with Agentic Tool-Calling AI
```

## How It Works

1. **User** enters a stock ticker in the Chrome Extension popup (e.g., `AAPL`, `GULF.BK`).
2. **Extension** sends a POST request to the Next.js backend `/api/analyze`.
3. **Backend AI Agent** (via OpenRouter) autonomously decides which tools to call:
   - `get_stock_price` — current price, volume, avg volume
   - `get_technical_indicators` — RSI, MACD, EMA
   - `get_recent_news` — latest 5 headlines
4. **AI synthesizes** a risk-aware analysis as an aggressive quantitative day trader.
5. **Backend streams** the response back to the extension via Server-Sent Events.

## Getting Started

### Prerequisites
- Node.js >= 20
- An [OpenRouter](https://openrouter.ai/) API key

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp web-backend/.env.example web-backend/.env.local
# Fill in your OPENROUTER_API_KEY
```

### 3. Run the Backend
```bash
npm run dev:backend
```

### 4. Build the Extension
```bash
npm run build:extension
```

### 5. Load Extension in Chrome
1. Navigate to `chrome://extensions/`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select `extension/dist/`

## Tech Stack

| Layer | Technology |
|---|---|
| Extension UI | React, TypeScript, Tailwind CSS |
| Extension Runtime | Chrome MV3, Service Worker |
| Backend Framework | Next.js 14 (App Router) |
| AI Gateway | OpenRouter API |
| AI Models | Claude 3.5 Sonnet / GPT-4o |
| Market Data | yahoo-finance2 |
| News Scraping | Cheerio / RSS feeds |
