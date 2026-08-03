export const dynamic = 'force-dynamic';

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/analyze
//
// Agentic AI Workflow with Tool Calling + True OpenRouter Final Streaming (SSE)
//
// Flow:
//   1. Validate request body (ticker & optional model)
//   2. Send initial message + tools to OpenRouter (non-streaming mode for tool execution)
//   3. Loop while model calls tools: execute tools → send tool_call SSE events → push results
//   4. Once tool-calling loop completes, call OpenRouter with stream: true
//   5. Forward OpenRouter SSE delta chunks to client using { type: "text_chunk", content }
// ──────────────────────────────────────────────────────────────────────────────

import { NextRequest } from "next/server";
import { z } from "zod";
import { STOCK_ANALYSIS_TOOLS } from "@/lib/tools/definitions";
import { executeTool }          from "@/lib/tools/executor";
import { SYSTEM_PROMPT }        from "@/lib/prompts/systemPrompt";

// ─── Config ──────────────────────────────────────────────────────────────────

const OPENROUTER_URL  = "https://openrouter.ai/api/v1/chat/completions";
const OPENAI_GPT4_TURBO_MODEL = "openai/gpt-4-turbo";
const MAX_TOOL_ROUNDS = 6;

const REQUEST_SCHEMA = z.object({
  ticker: z
    .string()
    .trim()
    .min(1, "Ticker is required")
    .max(12, "Ticker too long")
    .regex(/^[A-Z0-9.^-]+$/i, "Invalid ticker format"),
  model: z.string().optional(),
});

// ─── Utility Helpers ─────────────────────────────────────────────────────────

/**
 * Truncates text input/context to max 1500 characters to optimize token usage.
 */
function truncateInput(text: string, maxLength: number = 1500): string {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

/**
 * Safely attempts to parse JSON with fallback to regex object extraction.
 */
function safeParseJSON<T>(raw: string, fallback: T): T {
  if (!raw || typeof raw !== "string") return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn("[Analyze] Standard JSON.parse failed, attempting regex object block extraction...", e);
    try {
      const matches = raw.match(/\{[^{}]*\}/g);
      if (matches && matches.length > 0) {
        for (const match of matches) {
          try {
            return JSON.parse(match) as T;
          } catch {
            // continue searching next block
          }
        }
      }
    } catch {
      // ignore
    }
    return fallback;
  }
}

// ─── SSE Helpers ─────────────────────────────────────────────────────────────

type SSEEvent =
  | { type: "tool_call";  toolName: string; status: "started" | "completed"; data?: unknown }
  | { type: "text_chunk"; content: string }
  | { type: "done";       totalTokens?: number; model?: string }
  | { type: "error";      message: string };

function encodeSSE(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ─── OpenRouter Fetch Wrapper ─────────────────────────────────────────────────

interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: OpenRouterToolCall[];
  name?: string;
}

interface OpenRouterToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: OpenRouterToolCall[];
    };
    finish_reason: "stop" | "tool_calls" | "length";
  }>;
  usage?: { total_tokens: number };
}

async function callOpenRouter(
  messages: OpenRouterMessage[],
  stream: false,
  apiKey: string
): Promise<OpenRouterResponse>;

async function callOpenRouter(
  messages: OpenRouterMessage[],
  stream: true,
  apiKey: string
): Promise<Response>;

async function callOpenRouter(
  messages: OpenRouterMessage[],
  stream: boolean,
  apiKey: string
): Promise<OpenRouterResponse | Response> {
  if (!apiKey) throw new Error("OpenRouter API key is missing");

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
      "HTTP-Referer":  process.env.HTTP_REFERER || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title":       process.env.X_TITLE || process.env.NEXT_PUBLIC_SITE_NAME || "SpeedInvest",
    },
    body: JSON.stringify({
      model:       OPENAI_GPT4_TURBO_MODEL,
      messages,
      ...(stream ? {} : { tools: STOCK_ANALYSIS_TOOLS, tool_choice: "auto" }),
      stream,
      temperature: 0.3,
      max_tokens:  800,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${errBody}`);
  }

  if (stream) return response;
  return response.json() as Promise<OpenRouterResponse>;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-openrouter-key, Authorization",
};

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 0. Authenticate ─────────────────────────────────────────────────────
  const providedKey = req.headers.get("x-openrouter-key");
  const apiKey = providedKey || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return new Response(
      encodeSSE({ type: "error", message: "Unauthorized: Missing OpenRouter API Key" }),
      {
        status: 401,
        headers: {
          "Content-Type": "text/event-stream",
          ...CORS_HEADERS,
        },
      }
    );
  }

  // ── 1. Parse & Validate Request ─────────────────────────────────────────
  let ticker: string;

  try {
    const rawBody = await req.text();
    const body = safeParseJSON(rawBody, {});
    const parsed = REQUEST_SCHEMA.parse(body);
    ticker = parsed.ticker.toUpperCase();
  } catch (err) {
    return new Response(
      encodeSSE({ type: "error", message: (err as Error).message }),
      {
        status: 400,
        headers: {
          "Content-Type": "text/event-stream",
          ...CORS_HEADERS,
        },
      }
    );
  }

  // ── 2. Set up SSE Stream ─────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(encodeSSE(event)));
      };

      try {
        // ── 3. Initialize conversation messages with input truncation ─────
        const initialPrompt = truncateInput(
          `Please analyze the stock ticker: **${ticker}**\n\nUse available tools to gather complete data before providing your analysis.\nCall get_stock_price, get_technical_indicators, get_fundamental_data, and get_recent_news — in that order.`,
          1500
        );

        const messages: OpenRouterMessage[] = [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: initialPrompt,
          },
        ];

        // ── 4. Agentic Tool-Calling Loop ─────────────────────────────────
        let round = 0;
        let requiresFinalStreaming = true;

        while (round < MAX_TOOL_ROUNDS) {
          round++;

          // Call OpenRouter in non-streaming mode to handle tool choice
          const response = await callOpenRouter(messages, false, apiKey);
          const choice = response.choices[0];

          if (!choice) throw new Error("No response from model");

          const assistantMessage = choice.message;

          // ── 4a. Handle tool_calls ────────────────────────────────────
          if (
            choice.finish_reason === "tool_calls" &&
            assistantMessage.tool_calls?.length
          ) {
            messages.push(assistantMessage as OpenRouterMessage);

            for (const toolCall of assistantMessage.tool_calls) {
              const toolName = toolCall.function.name;
              const toolArgs = safeParseJSON<Record<string, string>>(toolCall.function.arguments, { ticker });

              // Notify client tool starting
              send({ type: "tool_call", toolName, status: "started" });

              // Execute tool
              let toolResult: unknown;
              try {
                toolResult = await executeTool(toolName, toolArgs);
                console.log(`[TOOL RESULT: ${toolName}]`, JSON.stringify(toolResult, null, 2));
              } catch (toolErr) {
                toolResult = { error: (toolErr as Error).message };
              }

              // Notify client tool completed
              send({ type: "tool_call", toolName, status: "completed", data: toolResult });

              // Push truncated result back to messages to conserve prompt tokens
              const truncatedResult = truncateInput(JSON.stringify(toolResult), 1500);
              messages.push({
                role:         "tool",
                tool_call_id: toolCall.id,
                name:         toolName,
                content:      truncatedResult,
              });
            }

            // Continue loop to process next tool or transition to final answer
            continue;
          }

          // If no more tool_calls, we exit the loop and proceed to true streaming
          if (choice.finish_reason === "stop") {
            if (assistantMessage.content) {
              messages.push(assistantMessage as OpenRouterMessage);
            }
          }

          break;
        }

        // ── 5. True OpenRouter Final Synthesis Streaming ───────────────────
        if (requiresFinalStreaming) {
          const openRouterStream = await callOpenRouter(messages, true, apiKey);

          if (!openRouterStream.body) {
            throw new Error("OpenRouter stream body is null");
          }

          const reader = openRouterStream.body
            .pipeThrough(new TextDecoderStream())
            .getReader();

          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += value;
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":")) continue;
              if (trimmed === "data: [DONE]") continue;

              if (trimmed.startsWith("data: ")) {
                try {
                  const parsedData = safeParseJSON<any>(trimmed.slice(6), null);
                  const deltaContent = parsedData?.choices?.[0]?.delta?.content;
                  if (deltaContent) {
                    send({ type: "text_chunk", content: deltaContent });
                  }
                } catch {
                  // Skip invalid JSON lines
                }
              }
            }
          }

          send({
            type: "done",
            model: OPENAI_GPT4_TURBO_MODEL,
          });
        }
      } catch (err: unknown) {
        send({
          type:    "error",
          message: (err as Error).message ?? "Internal server error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
      ...CORS_HEADERS,
    },
  });
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
