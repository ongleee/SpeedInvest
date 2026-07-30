// API health check endpoint
// GET /api/health → { status: "ok", version: "1.0.0", timestamp }
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status:    "ok",
    service:   "SpeedInvest API",
    version:   "1.0.0",
    timestamp: new Date().toISOString(),
    model:     process.env.OPENROUTER_MODEL ?? "anthropic/claude-3-5-sonnet",
    tools:     ["get_stock_price", "get_technical_indicators", "get_recent_news"],
  });
}
