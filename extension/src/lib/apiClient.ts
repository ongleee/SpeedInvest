// ────────────────────────────────────────────────────────
// API client for communicating with the Next.js backend
// Handles SSE streaming and maps events to typed objects
// ────────────────────────────────────────────────────────

import type { AnalyzeRequest, StreamEvent, RadarResponse } from "@/types";
import { getSettings } from "./storage";

/**
 * Normalizes user-configured backend URL to get the target endpoint URL.
 * Accepts inputs like:
 * - "https://domain.com"
 * - "https://domain.com/"
 * - "https://domain.com/api/analyze"
 * - "https://domain.com/api/radar"
 */
export function getEndpointUrl(userUrl: string, endpoint: "/api/analyze" | "/api/radar"): string {
  const cleaned = (userUrl || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/(analyze|radar)$/i, "");

  return `${cleaned}${endpoint}`;
}

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
  const url = getEndpointUrl(settings.backendUrl, "/api/analyze");

  const body: AnalyzeRequest = {
    ticker: ticker.trim().toUpperCase(),
    model: settings.model,
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "x-openrouter-key": settings.openRouterApiKey,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (fetchErr: unknown) {
    const errorDetails = (fetchErr as Error).message ?? String(fetchErr);
    console.error(`[API Client] Network fetch error calling ${url}:`, fetchErr);
    throw new Error(`Failed to connect to ${url}: ${errorDetails}`);
  }

  if (!response.ok) {
    let errText = "";
    try {
      errText = await response.text();
    } catch {
      errText = "Unable to read response body";
    }
    console.error(`[API Client] HTTP error ${response.status} from ${url}:`, errText);
    throw new Error(`Backend error ${response.status}: ${errText}`);
  }

  if (!response.body) {
    const err = "Response body is null — streaming not supported.";
    console.error(`[API Client] Error from ${url}:`, err);
    throw new Error(err);
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

/** Alias for streamAnalysis */
export const fetchAnalysis = streamAnalysis;

/**
 * Calls the /api/radar endpoint to run a Catalyst scan.
 * Derives the radar URL from the stored backend URL.
 *
 * @returns Parsed RadarResponse with catalyst list
 */
export async function fetchRadarScan(): Promise<RadarResponse> {
  const settings = await getSettings();
  const url = getEndpointUrl(settings.backendUrl, "/api/radar");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-openrouter-key": settings.openRouterApiKey,
      },
      body: JSON.stringify({}),
    });
  } catch (fetchErr: unknown) {
    const errorDetails = (fetchErr as Error).message ?? String(fetchErr);
    console.error(`[API Client] Network fetch error calling ${url}:`, fetchErr);
    throw new Error(`Failed to connect to ${url}: ${errorDetails}`);
  }

  if (!response.ok) {
    let errText = "";
    try {
      errText = await response.text();
    } catch {
      errText = "Unable to read response body";
    }
    console.error(`[API Client] Radar API HTTP error ${response.status} from ${url}:`, errText);
    throw new Error(`Radar API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as RadarResponse;

  if (!data.success) {
    const errMessage = data.error ?? "Catalyst Radar scan failed.";
    console.error(`[API Client] Radar API returned unsuccessful response from ${url}:`, errMessage);
    throw new Error(errMessage);
  }

  return data;
}
