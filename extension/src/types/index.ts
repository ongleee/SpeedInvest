// ─────────────────────────────────────────────────────────────
// Shared type definitions for the SpeedInvest Chrome Extension
// ─────────────────────────────────────────────────────────────

/** Raw stock price data returned by the get_stock_price tool */
export interface StockPriceData {
  ticker: string;
  currentPrice: number;
  previousClose: number;
  changePercent: number;
  volume: number;
  averageVolume: number;
  /** Volume ratio: volume / averageVolume. > 2 is a notable spike */
  volumeRatio: number;
  marketCap: number | null;
  currency: string;
  timestamp: string;
  /** Recent historical prices for rendering sparkline chart */
  recentPrices?: number[];
}

/** Technical indicator data returned by get_technical_indicators */
export interface TechnicalIndicatorData {
  ticker: string;
  rsi14: number;           // 0-100; >70 overbought, <30 oversold
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  ema9: number;
  ema21: number;
  ema50: number;
  ema200: number;
  timestamp: string;
}

/** A single news headline */
export interface NewsHeadline {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  /** Rough pre-analysis sentiment: positive | negative | neutral */
  sentiment: "positive" | "negative" | "neutral";
}

/** News data returned by get_recent_news */
export interface RecentNewsData {
  ticker: string;
  headlines: NewsHeadline[];
  fetchedAt: string;
}

/** Possible analysis states in the UI */
export type AnalysisStatus =
  | "idle"
  | "fetching_data"
  | "analyzing"
  | "streaming"
  | "done"
  | "error";

/** The tool-call event sent over the SSE stream */
export interface ToolCallEvent {
  type: "tool_call";
  toolName: string;
  status: "started" | "completed";
  data?: StockPriceData | TechnicalIndicatorData | RecentNewsData;
}

/** A text chunk streamed from the AI */
export interface TextChunkEvent {
  type: "text_chunk";
  content: string;
}

/** Final completion signal */
export interface DoneEvent {
  type: "done";
  totalTokens?: number;
  model?: string;
}

/** Error event from the stream */
export interface ErrorEvent {
  type: "error";
  message: string;
}

/** Union of all SSE event types */
export type StreamEvent =
  | ToolCallEvent
  | TextChunkEvent
  | DoneEvent
  | ErrorEvent;

/** Request body sent to the backend /api/analyze */
export interface AnalyzeRequest {
  ticker: string;
  model?: string;
}

/** Chrome storage schema for persisting settings */
export interface ExtensionSettings {
  backendUrl: string;
  model: string;
}

// ─── Catalyst Radar Types ─────────────────────────────────────────────────────

/** A single tradable event identified by the AI Catalyst Screener */
export interface CatalystResult {
  ticker:         string;
  impact_score:   number;
  direction:      "BULLISH" | "BEARISH";
  event_category: "EARNINGS" | "M&A" | "PRODUCT" | "REGULATORY" | "MACRO";
  reason:         string;
}

/** Full response from the /api/radar endpoint */
export interface RadarResponse {
  success:        boolean;
  catalysts:      CatalystResult[];
  headlines_used: number;
  model:          string;
  scanned_at:     string;
  error?:         string;
}
