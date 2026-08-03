export const dynamic = 'force-dynamic';

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
const STRICT_MAX_TOKENS = 500;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CatalystResult {
  ticker:             string;
  impact_score:       number;
  direction:          "BULLISH" | "BEARISH";
  event_category:     string;
  reason:             string;
  actionable_summary?: string;
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

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Truncates text to a maximum length to save prompt tokens.
 */
function truncateInput(text: string, maxLength: number = 1500): string {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

/**
 * Ensures event_category strictly adheres to 'UPCOMING' or 'FORECAST'.
 */
function sanitizeCatalystCategory(item: CatalystResult): CatalystResult {
  const cat = (item.event_category || "").toUpperCase();
  if (cat !== "UPCOMING" && cat !== "FORECAST") {
    item.event_category = "UPCOMING";
  }
  return item;
}

/**
 * Cleans the raw string response from the LLM model before parsing JSON.
 * Strips out markdown code block formatting (like ```json and ```) and trims whitespace.
 */
function cleanJsonResponse(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/```(?:json)?/gi, "").replace(/```/g, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  if (firstBrace !== -1 && lastBrace > firstBrace && (firstBracket === -1 || firstBrace < firstBracket)) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.slice(firstBracket, lastBracket + 1);
  }
  return cleaned.trim();
}

/**
 * Safely parses LLM response using standard JSON parsing with a regex block extraction fallback.
 * Extracts complete object blocks {...} containing "ticker" to tolerate cut-off responses.
 * Returns [] fallback on complete parse failure.
 */
function safeParseCatalysts(rawContent: string): CatalystResult[] {
  if (!rawContent || typeof rawContent !== "string") {
    return [];
  }

  // 1. Try standard JSON parse on cleaned content
  try {
    const cleaned = cleanJsonResponse(rawContent);
    const parsed = JSON.parse(cleaned);
    let items: any[] = [];

    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && typeof parsed === "object" && Array.isArray(parsed.catalysts)) {
      items = parsed.catalysts;
    }

    if (items.length > 0) {
      const validItems = items
        .filter((item) => item && typeof item === "object" && "ticker" in item)
        .map((item) => sanitizeCatalystCategory(item as CatalystResult));
      if (validItems.length > 0) return validItems;
    }
  } catch (e) {
    console.warn("[Radar] Full JSON parse failed, attempting regex object block extraction...", e);
  }

  // 2. Regex fallback: Extract complete {...} blocks containing "ticker"
  try {
    const extractedItems: CatalystResult[] = [];
    const matches = rawContent.match(/\{[^{}]*\}/g) || [];

    for (const match of matches) {
      if (!match.includes('"ticker"') && !match.includes("'ticker'")) {
        continue;
      }
      try {
        const obj = JSON.parse(match);
        if (obj && typeof obj === "object" && obj.ticker) {
          extractedItems.push(sanitizeCatalystCategory(obj as CatalystResult));
        }
      } catch {
        // Skip incomplete or invalid individual object blocks
      }
    }

    return extractedItems;
  } catch (err) {
    console.error("[Radar] Regex object block extraction failed:", err);
    return [];
  }
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const CATALYST_SYSTEM_PROMPT = `You are 'Catalyst', an elite AI Quantitative News Screener focused heavily on Forward-looking and Predictive analysis. Analyze a batch of recent news headlines and identify high-probability tradable events and future market catalysts.

FOCUS & PRIORITIZATION:
- Prioritize identifying UPCOMING events, earnings previews, scheduled announcements, future macroeconomic shifts, or market rumors.

CRITICAL INSTRUCTIONS:
1. Prioritize identifying UPCOMING events, earnings previews, scheduled announcements, future macroeconomic shifts, or market rumors.
2. The 'actionable_summary' (in Thai) MUST NOT just summarize past news, but explicitly state the expected future impact, potential trends, or what the market is anticipating (e.g., "คาดการณ์ว่าการประกาศสัปดาห์หน้าจะทำให้...", "ตลาดกำลังจับตาดูแนวโน้ม...").
3. CRITICAL: The 'event_category' MUST ONLY be 'UPCOMING' or 'FORECAST'. NEVER use industry names like 'มหภาค (MACRO)'. If you are unsure, default to 'UPCOMING'.
4. Output text fields ('reason', 'actionable_summary') MUST be written fluently in Thai language.
5. Output strictly remains in valid JSON format.

STRICT OUTPUT FORMAT (JSON ONLY). Do not output markdown code blocks, just raw JSON:
{
  "catalysts": [
    {
      "ticker": "AAPL",
      "impact_score": 85,
      "direction": "BEARISH",
      "event_category": "UPCOMING",
      "reason": "รายงานผลประกอบการสัปดาห์หน้าอาจได้รับผลกระทบจากปัญหาการขาดแคลนชิป",
      "actionable_summary": "คาดการณ์ว่าการประกาศสัปดาห์หน้าจะทำให้แรงขายเพิ่มขึ้น ตลาดกำลังจับตาดูแนวโน้มยอดขายและอาจกดดันราคาหุ้นระยะสั้น"
    }
  ]
}

FEW-SHOT EXAMPLE FOR UPCOMING / FORECAST CATEGORIES:
Example Output format:
[
  {
    "ticker": "NVDA",
    "impact_score": 90,
    "direction": "BULLISH",
    "event_category": "UPCOMING",
    "reason": "คาดการณ์การประกาศผลประกอบการในสัปดาห์หน้า อาจส่งผลให้ราคาหุ้นปรับตัวขึ้น"
  }
]

Rules:
- Focus heavily on forward-looking and predictive analysis.
- Prioritize UPCOMING events, earnings previews, scheduled announcements, future macroeconomic shifts, or market rumors.
- CRITICAL: The 'event_category' MUST ONLY be 'UPCOMING' or 'FORECAST'. NEVER use industry names like 'มหภาค (MACRO)'. If you are unsure, default to 'UPCOMING'.
- Only include stocks with a concrete, identifiable ticker symbol.
- impact_score must be 1-100 (integer).
- direction must be exactly "BULLISH" or "BEARISH".
- Output text fields ('reason', 'actionable_summary') MUST be written fluently in Thai language.
- reason must be concise and clearly explain why the stock will move.
- actionable_summary MUST NOT just summarize past news, but explicitly state the expected future impact, potential trends, or what the market is anticipating (e.g. "คาดการณ์ว่าการประกาศสัปดาห์หน้าจะทำให้...", "ตลาดกำลังจับตาดูแนวโน้ม...").
- Return a maximum of 8 catalysts, ordered by impact_score descending.
- If no strong catalysts are found, return an empty catalysts array.
- Strictly return valid JSON ONLY.
OUTPUT FORMAT: You MUST return ONLY raw, valid JSON. Do NOT wrap the output in markdown blocks (e.g., no \`\`\`json). Do NOT add any conversational text before or after the JSON object.`;

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

  const rawHeadlinesText = headlines
    .map((h, i) => {
      const related = h.related ? ` [${h.related}]` : "";
      return `${i + 1}. ${h.headline}${related} (${h.source})`;
    })
    .join("\n");

  // Truncate input headlines text to max 1500 characters
  const truncatedHeadlinesText = truncateInput(rawHeadlinesText, 1500);

  const userMessage = truncateInput(
    `Analyze these ${headlines.length} recent market news headlines and identify the most actionable trading catalysts:\n\n${truncatedHeadlinesText}\n\nReturn the top catalysts as a raw JSON object matching the required schema.`,
    1500
  );

  // Strictly construct OpenRouter payload with hardcoded max_tokens: 500 at TOP LEVEL
  const payload = {
    model:       HAIKU_MODEL,
    messages: [
      { role: "system", content: CATALYST_SYSTEM_PROMPT },
      { role: "user",   content: userMessage },
    ],
    temperature: 0.2,
    max_tokens:  STRICT_MAX_TOKENS,
  };

  const response = await fetch(OPENROUTER_URL, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
      "HTTP-Referer":  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title":       process.env.NEXT_PUBLIC_SITE_NAME || "SpeedInvest",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errBody}`);
  }

  const json   = await response.json();
  const rawContent: string = json?.choices?.[0]?.message?.content ?? "";

  // Robust JSON extraction with regex block matching
  const catalysts = safeParseCatalysts(rawContent);
  return { catalysts };
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

    // Extract & sanitize incoming JSON payload to prevent max_tokens overrides
    let rawBody = "";
    try {
      rawBody = await req.text();
    } catch {
      // Body may be empty
    }
    if (rawBody) {
      try {
        const body = JSON.parse(rawBody);
        delete body.max_tokens;
      } catch {
        // ignore JSON parse error for empty body
      }
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

    // Graceful fallback array [] instead of throwing 500 error
    return NextResponse.json(
      { success: true, catalysts: [], error: message },
      { status: 200, headers: CORS_HEADERS }
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
