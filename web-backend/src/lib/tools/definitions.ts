// ─────────────────────────────────────────────────────────────────────────
// AI Tool Definitions for the OpenRouter / OpenAI tool-calling interface
//
// Each definition follows the OpenAI function-calling schema.
// These objects are sent to the model in the `tools` array of the request.
// ─────────────────────────────────────────────────────────────────────────

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export const STOCK_ANALYSIS_TOOLS: OpenAITool[] = [
  {
    type: "function",
    function: {
      name: "get_stock_price",
      description: `Retrieves the current real-time quote for a stock ticker.
Returns: current price, previous close, percentage change, today's volume,
30-day average volume, volume ratio (today/avg), market cap, and currency.
Use this first to establish whether there is a volume spike (ratio > 2x).`,
      parameters: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description:
              "The stock ticker symbol, e.g. 'AAPL', 'GULF.BK', 'TSLA'. " +
              "For Thai stocks append .BK, for London append .L, etc.",
          },
        },
        required: ["ticker"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_technical_indicators",
      description: `Computes key technical indicators for a stock ticker using recent OHLCV data.
Returns: RSI-14, MACD line, MACD signal, MACD histogram,
EMA-9, EMA-21, EMA-50, and EMA-200.
Use this to determine momentum, trend direction, and overbought/oversold conditions.
Never invent these numbers — they must come from this tool.`,
      parameters: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description: "The stock ticker symbol.",
          },
        },
        required: ["ticker"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_fundamental_data",
      description:
        "Fetches fundamental financial data, insider ownership, float, debt, and cash flow.",
      parameters: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description: "The stock ticker symbol.",
          },
        },
        required: ["ticker"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_recent_news",
      description: `Fetches the latest 5 news headlines for a stock ticker from Yahoo Finance RSS.
Returns: title, source, published timestamp, URL, and a preliminary sentiment label.
Use this to assess market sentiment and identify any catalysts (earnings, FDA decisions,
regulatory announcements, or insider activity) that could drive price volatility.`,
      parameters: {
        type: "object",
        properties: {
          ticker: {
            type: "string",
            description: "The stock ticker symbol.",
          },
        },
        required: ["ticker"],
      },
    },
  },
];
