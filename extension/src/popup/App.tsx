// ─────────────────────────────────────────────────────────────────────
// Root App component — manages global state & renders popup layout
// Supports view switching: Main Analysis | Catalyst Radar
// ─────────────────────────────────────────────────────────────────────
import React, { useState, useRef, useCallback } from "react";
import TickerInput    from "@/components/TickerInput";
import AnalysisPanel  from "@/components/AnalysisPanel";
import Header         from "@/components/Header";
import Settings       from "@/popup/Settings";
import CatalystRadar  from "@/components/CatalystRadar";
import { streamAnalysis } from "@/lib/apiClient";
import type { AnalysisStatus, StreamEvent, ToolCallEvent } from "@/types";

export interface ActiveTool {
  name: string;
  status: "started" | "completed";
  data?: unknown;
}

type TabState = "analysis" | "radar";

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabState>("analysis");
  const [showSettings, setShowSettings] = useState(false);
  
  const [ticker, setTicker]       = useState("");
  const [status, setStatus]       = useState<AnalysisStatus>("idle");
  const [analysisText, setAnalysisText] = useState("");
  const [activeTools, setActiveTools]   = useState<ActiveTool[]>([]);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const handleAnalyze = useCallback(async (overrideTicker?: string) => {
    const targetTicker = (overrideTicker ?? ticker).trim();
    if (!targetTicker || status === "streaming" || status === "fetching_data") return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAnalysisText("");
    setActiveTools([]);
    setErrorMsg(null);
    setStatus("fetching_data");

    try {
      await streamAnalysis(
        targetTicker,
        (event: StreamEvent) => {
          switch (event.type) {
            case "tool_call": {
              const tc = event as ToolCallEvent;
              setStatus("fetching_data");
              setActiveTools((prev) => {
                const existing = prev.findIndex((t) => t.name === tc.toolName);
                if (existing !== -1) {
                  const updated = [...prev];
                  updated[existing] = {
                    name: tc.toolName,
                    status: tc.status,
                    data: tc.data ?? updated[existing].data,
                  };
                  return updated;
                }
                return [...prev, { name: tc.toolName, status: tc.status, data: tc.data }];
              });
              break;
            }
            case "text_chunk": {
              setStatus("streaming");
              setAnalysisText((prev) => prev + event.content);
              break;
            }
            case "done": {
              setStatus("done");
              break;
            }
            case "error": {
              setErrorMsg(event.message);
              setStatus("error");
              break;
            }
          }
        },
        controller.signal
      );
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setErrorMsg((err as Error).message ?? "Unknown error");
      setStatus("error");
    }
  }, [ticker, status]);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setStatus("idle");
    setAnalysisText("");
    setActiveTools([]);
    setErrorMsg(null);
  }, []);

  const handleLaunchApex = useCallback((apexTicker: string) => {
    handleReset();
    setTicker(apexTicker.toUpperCase());
    setCurrentTab("analysis");
    setTimeout(() => handleAnalyze(apexTicker.toUpperCase()), 0);
  }, [handleReset, handleAnalyze]);

  return (
    <div className="w-full h-screen max-h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden relative">
      <Header
        onReset={handleReset}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* ── Settings Modal ─────────────────────────────────────────────────── */}
      {showSettings && (
        <Settings onBack={() => setShowSettings(false)} />
      )}

      {/* ── Tab Navigation ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0 px-4 pt-2 shrink-0 border-b border-slate-800/60 relative z-10">
        <button
          onClick={() => setCurrentTab("analysis")}
          className={`
            flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono font-semibold
            tracking-wider border-b-2 transition-all duration-200 -mb-px
            ${currentTab === "analysis"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-300"
            }
          `}
        >
          <span>📈</span>
          <span>APEX ANALYZER</span>
        </button>

        <button
          onClick={() => setCurrentTab("radar")}
          className={`
            flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono font-semibold
            tracking-wider border-b-2 transition-all duration-200 -mb-px
            ${currentTab === "radar"
              ? "border-emerald-400 text-emerald-400"
              : "border-transparent text-slate-500 hover:text-slate-300"
            }
          `}
        >
          <span>🎯</span>
          <span>CATALYST RADAR</span>
        </button>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex flex-col gap-3 px-4 pb-4 pt-3 flex-1 h-0 overflow-hidden relative z-0">
        {currentTab === "analysis" && (
          <>
            <TickerInput
              value={ticker}
              onChange={setTicker}
              onAnalyze={() => handleAnalyze()}
              disabled={status === "streaming" || status === "fetching_data"}
            />

            <AnalysisPanel
              status={status}
              analysisText={analysisText}
              activeTools={activeTools}
              errorMsg={errorMsg}
            />
          </>
        )}

        {currentTab === "radar" && (
          <CatalystRadar onLaunchApex={handleLaunchApex} />
        )}
      </main>
    </div>
  );
};

export default App;
