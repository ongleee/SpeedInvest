// ─────────────────────────────────────────────────────────────────────────────
// AnalysisPanel — shows tool-call progress, RiskGauge, Sparkline & streaming text
// ─────────────────────────────────────────────────────────────────────────────
import React from "react";
import type { AnalysisStatus, StockPriceData } from "@/types";
import type { ActiveTool } from "@/popup/App";
import RiskGauge from "./RiskGauge";
import Sparkline from "./Sparkline";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AnalysisPanelProps {
  status: AnalysisStatus;
  analysisText: string;
  activeTools: ActiveTool[];
  errorMsg: string | null;
}

const TOOL_LABELS: Record<string, string> = {
  get_stock_price:          "📈 Stock Price & Volume",
  get_technical_indicators: "📊 Technical Indicators (RSI/MACD/EMA)",
  get_recent_news:          "📰 News & Sentiment",
};

/** Helper to extract Risk Score from AI analysis markdown text */
function parseRiskScore(text: string): number | null {
  const match = text.match(/Risk Score\*?\*?:?\s*\[?(\d{1,2})\]?\s*\/\s*10/i);
  if (match && match[1]) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num >= 1 && num <= 10) return num;
  }
  return null;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  status,
  analysisText,
  activeTools,
  errorMsg,
}) => {
  // Check if stock price tool returned sparkline price history
  const priceTool = activeTools.find((t) => t.name === "get_stock_price");
  const stockData = priceTool?.data as StockPriceData | undefined;
  const recentPrices = stockData?.recentPrices;

  // Try parsing risk score from text
  const extractedRiskScore = parseRiskScore(analysisText);

  if (status === "idle") {
    return (
      <div className="flex flex-col items-center justify-center flex-1 py-12 px-4 text-center animate-fade-in border border-dashed border-slate-800/80 rounded-2xl bg-slate-900/30 backdrop-blur-sm my-auto">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(0,255,136,0.15)] mb-3">
          <svg viewBox="0 0 24 24" className="w-8 h-8 text-emerald-400 fill-current" aria-hidden="true">
            <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6h-6z"/>
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100 font-mono tracking-tight">QUANT ANALYSIS ENGINE</h3>
          <p className="text-xs text-slate-400 mt-1.5 max-w-[320px] leading-relaxed">
            Enter any stock symbol above (e.g., <code className="text-emerald-400 font-mono">NVDA</code>, <code className="text-emerald-400 font-mono">AAPL</code>, <code className="text-emerald-400 font-mono">GULF.BK</code>) to start AI multi-tool analysis.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card border-rose-500/40 bg-rose-950/30 text-rose-300 animate-fade-in my-auto">
        <div className="flex items-start gap-3">
          <span className="text-rose-400 text-lg shrink-0 mt-0.5">⚠️</span>
          <div>
            <p className="text-xs font-bold font-mono text-rose-400 uppercase tracking-wider">Analysis Execution Failed</p>
            <p className="text-xs text-slate-300 mt-1 font-mono leading-relaxed">{errorMsg ?? "An error occurred while running quantitative analysis."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 flex-1 h-0 overflow-hidden animate-fade-in">
      {/* Tool-call progress pills */}
      {activeTools.length > 0 && (
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shrink-0 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-mono font-medium tracking-widest text-slate-400">
              AGENT WORKFLOW STEPS
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/50">
              {activeTools.filter((t) => t.status === "completed").length} / {activeTools.length} COMPLETED
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            {activeTools.map((tool) => (
              <div
                key={tool.name}
                className={`flex items-center justify-between text-xs font-mono px-3 py-1.5 rounded-lg border transition-all ${
                  tool.status === "completed"
                    ? "bg-slate-950/80 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                    : "bg-slate-950/40 border-amber-500/40 text-amber-300 animate-pulse"
                }`}
              >
                <span className="flex items-center gap-2">
                  {tool.status === "completed" ? (
                    <span className="text-emerald-400 font-bold">✓</span>
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                  {TOOL_LABELS[tool.name] ?? tool.name}
                </span>

                {tool.status === "completed" && (
                  <span className="text-[10px] text-emerald-400/80 font-mono">READY</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sparkline chart & Risk Gauge (Responsive Grid) */}
      <div className={`grid gap-3 shrink-0 ${recentPrices && recentPrices.length > 1 && extractedRiskScore !== null ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {recentPrices && recentPrices.length > 1 && (
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-mono font-medium tracking-widest text-slate-400">
                15-DAY PRICE ACTION
              </span>
              <span className="text-[11px] font-mono text-slate-200 font-bold">
                ${stockData?.currentPrice.toFixed(2)} ({stockData && stockData.changePercent >= 0 ? "+" : ""}{stockData?.changePercent}%)
              </span>
            </div>
            <Sparkline data={recentPrices} height={48} />
          </div>
        )}

        {extractedRiskScore !== null && (
          <RiskGauge score={extractedRiskScore} label="Calculated volatility & momentum risk score" />
        )}
      </div>

      {/* Streaming analysis text report */}
      {(analysisText || status === "streaming") && (
        <div className="card flex-1 h-0 overflow-y-auto font-sans p-4 md:p-5 bg-slate-900/90 border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80 sticky top-0 bg-slate-900/95 backdrop-blur-md pt-0.5 z-10">
            <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              QUANT SYNTHESIS REPORT
            </span>
            {status === "streaming" && (
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                STREAMING REPORT
              </span>
            )}
          </div>
          <div
            className={`analysis-text ${status === "streaming" ? "streaming-cursor" : ""} prose prose-invert max-w-none text-sm leading-relaxed`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {analysisText || " "}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Skeleton loader while fetching data */}
      {status === "fetching_data" && analysisText === "" && (
        <div className="card flex-1 p-4">
          <span className="text-[10px] uppercase tracking-widest text-emerald-400 mb-3 block font-mono animate-pulse">
            RUNNING AGENTIC WORKFLOW & FETCHING DATA…
          </span>
          <div className="space-y-3">
            {[100, 85, 92, 75, 60, 80].map((w, i) => (
              <div
                key={i}
                className="h-3 bg-slate-800/80 rounded-lg animate-pulse"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
