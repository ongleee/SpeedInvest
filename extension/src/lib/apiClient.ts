// ────────────────────────────────────────────────────────
// API client for communicating with the Next.js backend
// Handles SSE streaming and maps events to typed objects
// ────────────────────────────────────────────────────────

import type { AnalyzeRequest, StreamEvent, RadarResponse } from "@/types";
import { getSettings } from "./storage";

/**
 * Streams the AI analysis for a given ticker from the backend.
 *
 * @param ticker - Stock ticker symbol, e.g. "AAPL" or "GULF.BK"
 * @param onEvent - Callback invoked for each parsed SSE event
 * @param signal - Optional AbortSignal to cancel the stream
 */
export async function streamAnalysis(
  ticker: string,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const settings = await getSettings();
  const url = settings.backendUrl;

  const body: AnalyzeRequest = {
    ticker: ticker.trim().toUpperCase(),
    model: settings.model,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "x-openrouter-key": settings.openRouterApiKey,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Backend error ${response.status}: ${errText}`);
  }

  if (!response.body) {
    throw new Error("Response body is null — streaming not supported.");
  }

  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .getReader();

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += value;
    const lines = buffer.split("\n");
    // Keep incomplete last line in buffer
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") return;
        try {
          const event = JSON.parse(payload) as StreamEvent;
          onEvent(event);
        } catch {
          // Skip malformed lines
        }
      }
    }
  }
}

/**
 * Calls the /api/radar endpoint to run a Catalyst scan.
 * Derives the radar URL from the stored backend URL.
 *
 * @returns Parsed RadarResponse with catalyst list
 */
export async function fetchRadarScan(): Promise<RadarResponse> {
  const settings = await getSettings();

  // Derive the radar URL from the configured backend URL
  // e.g. "http://localhost:3000/api/analyze" → "http://localhost:3000/api/radar"
  const radarUrl = settings.backendUrl.replace(/\/api\/[^/]+$/, "/api/radar");

  const response = await fetch(radarUrl, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "x-openrouter-key": settings.openRouterApiKey,
    },
    body:    JSON.stringify({}),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Radar API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as RadarResponse;

  if (!data.success) {
    throw new Error(data.error ?? "Catalyst Radar scan failed.");
  }

  return data;
}
