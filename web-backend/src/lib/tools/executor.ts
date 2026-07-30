// ──────────────────────────────────────────────────────────────────────────
// Tool Executor — implements the actual logic behind each AI tool call
// Direct Yahoo Finance v8 Chart API calls with custom User-Agent header
// ──────────────────────────────────────────────────────────────────────────

// ─── Type Definitions ────────────────────────────────────────────────────
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
export interface StockPriceResult {
  ticker: string;
  price: number;
  change: string;
  volume: number;
  marketCap: number | null;
  currency: string;
}

export interface TechnicalIndicatorResult {
  ticker: string;
  currentPrice: number;
  ema9: number;
  ema21: number;
  ema50: number;
  trend: "BULLISH" | "BEARISH";
}

export interface NewsHeadline {
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment: "positive" | "negative" | "neutral";
}

export interface RecentNewsResult {
  ticker: string;
  headlines: NewsHeadline[];
  fetchedAt: string;
}

export interface FundamentalDataResult {
  ticker: string;
  marketCap: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  grossMargins: number | null;
  totalCash: number | null;
  totalDebt: number | null;
  debtToEquity: number | null;
  freeCashflow: number | null;
  heldPercentInsiders: number | null;
  heldPercentInstitutions: number | null;
  floatShares: number | null;
  shortPercentOfFloat: number | null;
  averageVolume10days: number | null;
}

export interface StructuredError {
  ticker: string;
  error: string;
}

export type ToolResult =
  | StockPriceResult
  | TechnicalIndicatorResult
  | FundamentalDataResult
  | RecentNewsResult
  | StructuredError;

// ─── Utility Functions ───────────────────────────────────────────────────

/** Computes Exponential Moving Average (EMA) from an array of prices */
function computeEMA(closes: number[], period: number): number {
  if (closes.length === 0) return 0;
  if (closes.length < period) {
    return parseFloat(closes[closes.length - 1].toFixed(2));
  }

  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((acc, val) => acc + val, 0) / period;

  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }

  return parseFloat(ema.toFixed(2));
}

/** Classifies headline sentiment using keyword matching */
function classifySentiment(title: string): "positive" | "negative" | "neutral" {
  const lower = title.toLowerCase();
  const positiveWords = [
    "surge", "rally", "gain", "beat", "record", "upgrade", "buy",
    "breakthrough", "profit", "rises", "jumps", "soars", "bullish",
  ];
  const negativeWords = [
    "fall", "drop", "loss", "miss", "downgrade", "sell", "crash",
    "decline", "plunge", "bearish", "warning", "concern", "cut",
  ];

  const posScore = positiveWords.filter((w) => lower.includes(w)).length;
  const negScore = negativeWords.filter((w) => lower.includes(w)).length;

  if (posScore > negScore) return "positive";
  if (negScore > posScore) return "negative";
  return "neutral";
}

/** Safely extracts a numeric value from raw numbers, strings, or Yahoo API raw objects */
function extractVal(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  if (typeof val === "object" && typeof val.raw === "number") {
    return isNaN(val.raw) ? null : val.raw;
  }
  if (typeof val === "string") {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

// ─── Tier 2 Fallback (Finnhub API) ─────────────────────────────────────────

/**
 * Helper function to fetch real-time stock price from Finnhub's Quote API as Tier 2 Fallback.
 * Endpoint: https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${process.env.FINNHUB_API_KEY}
 */
async function fetchFinnhubStockPrice(
  ticker: string,
  yahooError: any
): Promise<StockPriceResult | StructuredError> {
  const symbol = ticker.toUpperCase();
  const apiKey = process.env.FINNHUB_API_KEY;

  if (!apiKey) {
    console.warn(`[Finnhub Fallback] FINNHUB_API_KEY is not set in environment variables.`);
    return {
      ticker: symbol,
      error: `Yahoo Finance failed (${yahooError?.message || "Error"}). Finnhub fallback unavailable because FINNHUB_API_KEY is missing.`,
    };
  }

  try {
    console.log(`[Finnhub Fallback] Fetching quote for ${symbol} from Finnhub API...`);
    const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;
    const res = await fetch(finnhubUrl);

    if (!res.ok) {
      throw new Error(`Finnhub API returned HTTP ${res.status}`);
    }

    const data = await res.json();

    // Finnhub returns { c: 0, d: null, dp: null, h: 0, l: 0, o: 0, pc: 0, t: 0 } for invalid tickers
    if (!data || (data.c === 0 && data.pc === 0 && (data.d === null || data.d === undefined))) {
      throw new Error(`No quote data returned from Finnhub for ticker ${symbol}`);
    }

    const price = parseFloat(Number(data.c ?? 0).toFixed(2));
    const diff = Number(data.d ?? 0);
    const pctChange = Number(data.dp ?? (data.pc ? (diff / data.pc) * 100 : 0));

    const signDiff = diff >= 0 ? "+" : "";
    const signPct = pctChange >= 0 ? "+" : "";
    const change = `${signDiff}${diff.toFixed(2)} (${signPct}${pctChange.toFixed(2)}%)`;

    const volume = Number(data.v ?? 0);
    const marketCap = null;
    const currency = "USD";

    console.log(`[Finnhub Fallback Success] ${symbol}: price=${price}, change=${change}, volume=${volume}`);

    return {
      ticker: symbol,
      price,
      change,
      volume,
      marketCap,
      currency,
    };
  } catch (finnhubErr: any) {
    console.warn(`[Finnhub Fallback Failed] ${symbol}: ${finnhubErr.message}`);
    return {
      ticker: symbol,
      error: `Yahoo Finance error: ${yahooError?.message || "Failed"}. Finnhub fallback error: ${finnhubErr.message}`,
    };
  }
}

// ─── Tool Implementations ────────────────────────────────────────────────

/**
 * Tool: get_stock_price
 * Fetches real-time price, change, volume, market cap, and currency via Yahoo Finance v8 API.
 * Uses Finnhub API as a Tier 2 Fallback if Yahoo Finance fails.
 */
export async function getStockPrice(
  ticker: string
): Promise<StockPriceResult | StructuredError> {
  const symbol = ticker.toUpperCase();
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=1d&range=1d`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    if (!res.ok) {
      throw new Error(`Yahoo Finance API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      const apiError =
        data?.chart?.error?.description || "No market data found for ticker";
      throw new Error(apiError);
    }

    const meta = result.meta || {};
    const quote = result.indicators?.quote?.[0] || {};
    const closes: number[] = (quote.close || []).filter(
      (c: any) => typeof c === "number" && !isNaN(c)
    );
    const volumes: number[] = (quote.volume || []).filter(
      (v: any) => typeof v === "number" && !isNaN(v)
    );

    const rawPrice =
      meta.regularMarketPrice ??
      (closes.length > 0 ? closes[closes.length - 1] : 0);
    const price = parseFloat(Number(rawPrice).toFixed(2));

    const prevClose =
      meta.previousClose ??
      meta.chartPreviousClose ??
      (closes.length > 0 ? closes[0] : price);

    const diff = price - prevClose;
    const pctChange = prevClose !== 0 ? (diff / prevClose) * 100 : 0;

    const signDiff = diff >= 0 ? "+" : "";
    const signPct = pctChange >= 0 ? "+" : "";
    const change = `${signDiff}${diff.toFixed(2)} (${signPct}${pctChange.toFixed(2)}%)`;

    const volume =
      meta.regularMarketVolume ??
      (volumes.length > 0 ? volumes[volumes.length - 1] : 0);
    const marketCap = meta.marketCap ?? null;
    const currency = meta.currency || "USD";

    return {
      ticker: symbol,
      price,
      change,
      volume,
      marketCap,
      currency,
    };
  } catch (err: any) {
    console.warn(
      `[getStockPrice] Yahoo Finance failed for ${symbol}: ${err.message}. Triggering Finnhub API Tier 2 Fallback...`
    );
    return await fetchFinnhubStockPrice(symbol, err);
  }
}

/**
 * Tool: get_technical_indicators
 * Fetches 60-day historical close prices via Yahoo Finance v8 API and calculates EMA 9, 21, 50, and trend.
 */
export async function getTechnicalIndicators(
  ticker: string
): Promise<TechnicalIndicatorResult | StructuredError> {
  try {
    const symbol = ticker.toUpperCase();
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
      symbol
    )}?interval=1d&range=60d`;

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    if (!res.ok) {
      throw new Error(`Yahoo Finance API returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      const apiError =
        data?.chart?.error?.description || "No historical data found for ticker";
      throw new Error(apiError);
    }

    const meta = result.meta || {};
    const quote = result.indicators?.quote?.[0] || {};
    const closes: number[] = (quote.close || []).filter(
      (c: any) => typeof c === "number" && !isNaN(c)
    );

    if (closes.length === 0) {
      throw new Error("No closing price series available");
    }

    const rawCurrentPrice =
      meta.regularMarketPrice ?? closes[closes.length - 1];
    const currentPrice = parseFloat(Number(rawCurrentPrice).toFixed(2));

    const ema9 = computeEMA(closes, 9);
    const ema21 = computeEMA(closes, 21);
    const ema50 = computeEMA(closes, 50);

    const trend: "BULLISH" | "BEARISH" =
      currentPrice > ema21 ? "BULLISH" : "BEARISH";

    return {
      ticker: symbol,
      currentPrice,
      ema9,
      ema21,
      ema50,
      trend,
    };
  } catch (err: any) {
    return {
      ticker: ticker.toUpperCase(),
      error: err.message || "Failed to fetch technical indicators",
    };
  }
}

/**
 * Tool: get_recent_news
 * Fetches the latest 5 Yahoo Finance RSS headlines for the ticker.
 */
export async function getRecentNews(
  ticker: string
): Promise<RecentNewsResult | StructuredError> {
  try {
    const symbol = ticker.toUpperCase();
    const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(
      symbol
    )}&region=US&lang=en-US`;

    const res = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return {
        ticker: symbol,
        headlines: [],
        fetchedAt: new Date().toISOString(),
      };
    }

    const xml = await res.text();

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    const headlines: NewsHeadline[] = [];
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null && headlines.length < 5) {
      const itemXml = match[1];
      const title =
        (/<title><!\[CDATA\[(.+?)\]\]><\/title>/.exec(itemXml) ??
          /<title>(.+?)<\/title>/.exec(itemXml))?.[1] ?? "";
      const link = /<link>(.+?)<\/link>/.exec(itemXml)?.[1] ?? "";
      const pubDate = /<pubDate>(.+?)<\/pubDate>/.exec(itemXml)?.[1] ?? "";
      const source =
        /<source[^>]*>(.+?)<\/source>/.exec(itemXml)?.[1] ?? "Yahoo Finance";

      if (title) {
        headlines.push({
          title: title.trim(),
          source: source.trim(),
          publishedAt: pubDate.trim(),
          url: link.trim(),
          sentiment: classifySentiment(title),
        });
      }
    }

    return {
      ticker: symbol,
      headlines,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      ticker: ticker.toUpperCase(),
      headlines: [],
      fetchedAt: new Date().toISOString(),
      error: err.message || "Failed to fetch recent news",
    };
  }
}

/**
 * Tool: get_fundamental_data
 * Fetches fundamental financial data, insider/inst ownership, float, debt, and cash flow via yahoo-finance2.
 */
export async function getFundamentalData(
  ticker: string
): Promise<FundamentalDataResult | StructuredError> {
  try {
    const symbol = ticker.toUpperCase();
    const result = await yahooFinance.quoteSummary(symbol, {
      modules: [
        "financialData",
        "defaultKeyStatistics",
        "summaryDetail",
        "majorHoldersBreakdown",
      ],
    });

    if (!result) {
      throw new Error("No fundamental data found for ticker");
    }

    const resAny = result as any;
    const financialData = resAny?.financialData || {};
    const defaultKeyStatistics = resAny?.defaultKeyStatistics || {};
    const summaryDetail = resAny?.summaryDetail || {};
    const majorHoldersBreakdown = resAny?.majorHoldersBreakdown || {};

    return {
      ticker: symbol,
      marketCap: extractVal(summaryDetail.marketCap),
      revenueGrowth: extractVal(financialData.revenueGrowth),
      earningsGrowth: extractVal(financialData.earningsGrowth),
      grossMargins: extractVal(financialData.grossMargins),
      totalCash: extractVal(financialData.totalCash),
      totalDebt: extractVal(financialData.totalDebt),
      debtToEquity: extractVal(financialData.debtToEquity),
      freeCashflow: extractVal(financialData.freeCashflow),
      heldPercentInsiders:
        extractVal(defaultKeyStatistics.heldPercentInsiders) ??
        extractVal(majorHoldersBreakdown.insidersPercentHeld),
      heldPercentInstitutions:
        extractVal(defaultKeyStatistics.heldPercentInstitutions) ??
        extractVal(majorHoldersBreakdown.institutionsPercentHeld),
      floatShares: extractVal(defaultKeyStatistics.floatShares),
      shortPercentOfFloat: extractVal(defaultKeyStatistics.shortPercentOfFloat),
      averageVolume10days:
        extractVal(summaryDetail.averageVolume10days) ??
        extractVal(summaryDetail.averageVolume),
    };
  } catch (err: any) {
    return {
      ticker: ticker.toUpperCase(),
      error: err.message || "Failed to fetch fundamental data",
    };
  }
}

// ─── Tool Dispatcher ─────────────────────────────────────────────────────

/** Maps tool name → executor function. Used by the agentic loop. */
export async function executeTool(
  name: string,
  args: Record<string, string>
): Promise<ToolResult> {
  const ticker = args?.ticker || "";
  let result: ToolResult;

  try {
    switch (name) {
      case "get_stock_price":
        result = await getStockPrice(ticker);
        break;
      case "get_technical_indicators":
        result = await getTechnicalIndicators(ticker);
        break;
      case "get_fundamental_data":
        result = await getFundamentalData(ticker);
        break;
      case "get_recent_news":
        result = await getRecentNews(ticker);
        break;
      default:
        result = {
          ticker: ticker.toUpperCase(),
          error: `Unknown tool: ${name}`,
        };
    }
  } catch (err: any) {
    result = {
      ticker: ticker.toUpperCase(),
      error: err.message || `Unhandled exception executing tool ${name}`,
    };
  }

  console.log(`[TOOL RESULT: ${name}]`, result);
  return result;
}
