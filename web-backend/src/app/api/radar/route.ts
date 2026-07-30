// ──────────────────────────────────────────────────────────────────────────────
// POST /api/radar
//
// Catalyst Radar — AI-Powered Market News Screener
//
// Flow:
//   1. Validate request (optional mode override)
//   2. Fetch real market news from Finnhub OR fall back to a rich mock dataset
//   3. Call OpenRouter (anthropic/claude-3-haiku) with a structured JSON prompt
//   4. Safely parse the response and return typed CatalystResult[]
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

// ─── Constants ────────────────────────────────────────────────────────────────

const OPENROUTER_URL  = "https://openrouter.ai/api/v1/chat/completions";
const HAIKU_MODEL     = "anthropic/claude-3-haiku";
const FINNHUB_BASE    = "https://finnhub.io/api/v1";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CatalystResult {
  ticker:         string;
  impact_score:   number;
  direction:      "BULLISH" | "BEARISH";
  event_category: string;
  reason:         string;
}

interface CatalystResponse {
  catalysts: CatalystResult[];
}

interface NewsHeadline {
  headline:  string;
  source:    string;
  datetime:  number;
  related?:  string;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const CATALYST_SYSTEM_PROMPT = `You are 'Catalyst', an elite AI Quantitative News Screener. Analyze a batch of recent news headlines and identify high-probability tradable events (Catalysts).

CRITICAL: The values for 'event_category' and 'reason' MUST be written in fluent Thai language. The 'reason' should be concise and clearly explain why the stock will move.

STRICT OUTPUT FORMAT (JSON ONLY). Do not output markdown code blocks, just raw JSON:
{
  "catalysts": [
    {
      "ticker": "AAPL",
      "impact_score": 85,
      "direction": "BEARISH",
      "event_category": "มหภาค (MACRO)",
      "reason": "ปัญหาการขาดแคลนหน่วยความจำอาจทำให้ Apple ผลิตสินค้าไม่ทันตามความต้องการ ซึ่งส่งผลเสียต่อราคาหุ้น"
    }
  ]
}

Rules:
- Only include stocks with a concrete, identifiable ticker symbol
- impact_score must be 1-100 (integer)
- direction must be exactly "BULLISH" or "BEARISH"
- event_category and reason MUST be written in fluent Thai language
- reason must be concise and clearly explain why the stock will move
- Return a maximum of 8 catalysts, ordered by impact_score descending
- If no strong catalysts are found, return an empty catalysts array`;

// ─── Mock News (rich fallback for dev / when Finnhub is unavailable) ──────────

const MOCK_HEADLINES: NewsHeadline[] = [
  { headline: "NVIDIA posts record Q2 revenue of $30B, beats estimates by 15%, raises Q3 guidance", source: "Reuters", datetime: Date.now() / 1000, related: "NVDA" },
  { headline: "Apple announces surprise $110B share buyback program, largest in company history", source: "Bloomberg", datetime: Date.now() / 1000, related: "AAPL" },
  { headline: "FDA issues complete response letter to Pfizer's new Alzheimer's drug, rejecting approval", source: "BioPharma Dive", datetime: Date.now() / 1000, related: "PFE" },
  { headline: "Microsoft acquires Anthropic stake in $2B strategic partnership deal", source: "WSJ", datetime: Date.now() / 1000, related: "MSFT" },
  { headline: "Tesla vehicle deliveries miss Q3 estimates by 8%, supply chain constraints cited", source: "CNBC", datetime: Date.now() / 1000, related: "TSLA" },
  { headline: "Amazon AWS revenue accelerates to 35% YoY growth, cloud demand surges", source: "Financial Times", datetime: Date.now() / 1000, related: "AMZN" },
  { headline: "Meta receives EU regulatory antitrust fine of €1.3B over data privacy violations", source: "Reuters", datetime: Date.now() / 1000, related: "META" },
  { headline: "Goldman Sachs Q3 trading revenue surges 28% as market volatility spikes", source: "Bloomberg", datetime: Date.now() / 1000, related: "GS" },
  { headline: "Eli Lilly Mounjaro shows 62% reduction in heart failure risk in major clinical trial", source: "STAT News", datetime: Date.now() / 1000, related: "LLY" },
  { headline: "Intel CEO announces 15,000 layoffs and factory spin-off plan amid chip market downturn", source: "Bloomberg", datetime: Date.now() / 1000, related: "INTC" },
  { headline: "Google DeepMind releases Gemini Ultra 2 with breakthrough reasoning capabilities, threatening OpenAI", source: "The Verge", datetime: Date.now() / 1000, related: "GOOGL" },
  { headline: "Berkshire Hathaway discloses new $5B stake in Occidental Petroleum", source: "SEC Filing", datetime: Date.now() / 1000, related: "OXY" },
];

// ─── Finnhub News Fetcher ─────────────────────────────────────────────────────

async function fetchFinnhubNews(): Promise<NewsHeadline[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey || apiKey === "your_finnhub_api_key_here") {
    console.warn("[Radar] No Finnhub API key found — using mock headlines.");
    return MOCK_HEADLINES;
  }

  try {
    const today    = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 2);

    const from = fromDate.toISOString().split("T")[0];
    const to   = today.toISOString().split("T")[0];

    const res = await fetch(
      `${FINNHUB_BASE}/news?category=general&token=${apiKey}&from=${from}&to=${to}`,
      { next: { revalidate: 0 } }
    );

    if (!res.ok) {
      console.warn(`[Radar] Finnhub responded ${res.status} — using mock headlines.`);
      return MOCK_HEADLINES;
    }

    const data = (await res.json()) as NewsHeadline[];

    if (!Array.isArray(data) || data.length === 0) {
      return MOCK_HEADLINES;
    }

    // Take most recent 20 headlines for the AI to process
    return data.slice(0, 20);
  } catch (err) {
    console.error("[Radar] Finnhub fetch failed:", err);
    return MOCK_HEADLINES;
  }
}

// ─── OpenRouter Caller ────────────────────────────────────────────────────────

async function callCatalystModel(headlines: NewsHeadline[], apiKey: string): Promise<CatalystResponse> {
  if (!apiKey) throw new Error("No API key provided for OpenRouter.");

  const headlinesText = headlines
    .map((h, i) => {
      const related = h.related ? ` [${h.related}]` : "";
      return `${i + 1}. ${h.headline}${related} (${h.source})`;
    })
    .join("\n");

  const userMessage = `Analyze these ${headlines.length} recent market news headlines and identify the most actionable trading catalysts:\n\n${headlinesText}\n\nReturn the top catalysts as a raw JSON object matching the required schema.`;

  const response = await fetch(OPENROUTER_URL, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
      "HTTP-Referer":  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title":       process.env.NEXT_PUBLIC_SITE_NAME || "SpeedInvest",
    },
    body: JSON.stringify({
      model:       HAIKU_MODEL,
      messages: [
        { role: "system", content: CATALYST_SYSTEM_PROMPT },
        { role: "user",   content: userMessage },
      ],
      temperature: 0.2,
      max_tokens:  1024,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errBody}`);
  }

  const json   = await response.json();
  const rawContent: string = json?.choices?.[0]?.message?.content ?? "";

  if (!rawContent) {
    throw new Error("OpenRouter returned an empty response content.");
  }

  // Safely strip any accidental markdown code fences (```) before parsing
  const cleaned = rawContent
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/,          "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as CatalystResponse;

    if (!Array.isArray(parsed.catalysts)) {
      throw new Error("Parsed response is missing the `catalysts` array.");
    }

    return parsed;
  } catch {
    throw new Error(`Failed to parse JSON from model response: ${cleaned.slice(0, 200)}`);
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-openrouter-key, Authorization",
};

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const providedKey = req.headers.get("x-openrouter-key");
    const apiKey = providedKey || process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing OpenRouter API Key", catalysts: [] },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    // 1. Fetch market headlines (real or mock)
    const headlines = await fetchFinnhubNews();

    // 2. Run the AI Catalyst screener
    const result = await callCatalystModel(headlines, apiKey);

    // 3. Return structured response
    return NextResponse.json(
      {
        success:       true,
        catalysts:     result.catalysts,
        headlines_used: headlines.length,
        model:         HAIKU_MODEL,
        scanned_at:    new Date().toISOString(),
      },
      { status: 200, headers: CORS_HEADERS }
    );
  } catch (err: unknown) {
    const message = (err as Error).message ?? "Internal server error";
    console.error("[/api/radar] Error:", message);

    return NextResponse.json(
      { success: false, error: message, catalysts: [] },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// ─── CORS Pre-flight ──────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-openrouter-key, Authorization",
    },
  });
}
