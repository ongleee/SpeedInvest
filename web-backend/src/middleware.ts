// ─────────────────────────────────────────────────────────────────────────────
// Next.js Middleware — IP-based Rate Limiter & Security Header Enforcement
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory sliding window store for IP rate limiting
// Note: In serverless environments, this resets on cold starts.
const ipMap = new Map<string, RateLimitRecord>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 15; // 15 requests / minute per IP

function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [ip, record] of ipMap.entries()) {
    if (now > record.resetTime) {
      ipMap.delete(ip);
    }
  }
}

export function middleware(req: NextRequest) {
  // Only apply rate limiting to /api/analyze endpoint
  if (req.nextUrl.pathname.startsWith("/api/analyze") && req.method === "POST") {
    cleanupExpiredEntries();

    // Get IP address from headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor
      ? forwardedFor.split(",")[0].trim()
      : req.headers.get("x-real-ip") || "127.0.0.1";

    const now = Date.now();
    let record = ipMap.get(ip);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + WINDOW_MS };
      ipMap.set(ip, record);
    } else {
      record.count += 1;
    }

    if (record.count > MAX_REQUESTS_PER_WINDOW) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      return new NextResponse(
        JSON.stringify({
          error: "Rate limit exceeded. Too many analysis requests.",
          retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(retryAfterSeconds),
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/analyze",
};
