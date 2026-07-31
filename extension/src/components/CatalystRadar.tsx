// ─────────────────────────────────────────────────────────────────────────────
// CatalystRadar — AI-powered market news screener UI
//
// Renders a "Radar Scan" button, scanning animation, and catalyst result cards.
// Each card has an "⚡ วิเคราะห์ด้วย APEX" button that triggers the APEX analyzer
// by setting the ticker and kicking off a full analysis in the parent App.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from "react";
import type { CatalystResult } from "@/types";
import { fetchRadarScan }      from "@/lib/apiClient";

// ─── Props ────────────────────────────────────────────────────────────────────

interface CatalystRadarProps {
  /** Called when user clicks "⚡ Analyze with APEX" — passes the ticker up */
  onLaunchApex: (ticker: string) => void;
}

// ─── Scan state ───────────────────────────────────────────────────────────────

type RadarStatus = "idle" | "scanning" | "done" | "error";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function impactColor(score: number): { bar: string; badge: string } {
  if (score >= 85) {
    return {
      bar:   "bg-emerald-400",
      badge: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
    };
  }
  if (score >= 70) {
    return {
      bar:   "bg-yellow-400",
      badge: "bg-yellow-500/20 border-yellow-500/40 text-yellow-300",
    };
  }
  return {
    bar:   "bg-slate-500",
    badge: "bg-slate-700/60 border-slate-600/40 text-slate-400",
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  EARNINGS:   "📊",
  "M&A":      "🤝",
  PRODUCT:    "🚀",
  REGULATORY: "⚖️",
  MACRO:      "🌐",
  UPCOMING:   "⏳",
  FORECAST:   "🔮",
};

/** Formats event_category into appropriate icon and display label */
function getCategoryDetails(eventCategory: string): { icon: string; label: string } {
  const upper = (eventCategory || "").toUpperCase();

  if (upper.includes("UPCOMING")) {
    return {
      icon: "⏳",
      label: "เหตุการณ์ในอนาคต (UPCOMING)",
    };
  }

  if (upper.includes("FORECAST")) {
    return {
      icon: "🔮",
      label: "การคาดการณ์ (FORECAST)",
    };
  }

  const icon = CATEGORY_ICONS[upper] ?? CATEGORY_ICONS[eventCategory] ?? "📌";
  return {
    icon,
    label: eventCategory,
  };
}

const DIRECTION_CONFIG = {
  BULLISH: {
    label:  "▲ BULLISH",
    class:  "text-emerald-400 bg-emerald-950/60 border-emerald-500/30",
    glow:   "shadow-[0_0_12px_rgba(52,211,153,0.18)]",
  },
  BEARISH: {
    label:  "▼ BEARISH",
    class:  "text-rose-400 bg-rose-950/60 border-rose-500/30",
    glow:   "shadow-[0_0_12px_rgba(255,59,92,0.18)]",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Radar sweep animation */
const RadarSweep: React.FC = () => (
  <div className="relative flex items-center justify-center w-20 h-20 mx-auto mb-4">
    {/* Outer rings */}
    <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping" style={{ animationDuration: "2s" }} />
    <div className="absolute inset-2 rounded-full border border-emerald-500/30 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.4s" }} />
    <div className="absolute inset-4 rounded-full border border-emerald-500/40 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.8s" }} />
    {/* Rotating sweep arm */}
    <div
      className="absolute inset-0 rounded-full overflow-hidden"
      style={{ animation: "spin 1.8s linear infinite" }}
    >
      <div
        className="absolute top-1/2 left-1/2 w-1/2 h-0.5 origin-left"
        style={{
          background: "linear-gradient(to right, rgba(52,211,153,0.9), transparent)",
          transform: "translateY(-50%)",
        }}
      />
    </div>
    {/* Center dot */}
    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] z-10" />
  </div>
);

/** Individual catalyst card */
const CatalystCard: React.FC<{
  catalyst:     CatalystResult;
  index:        number;
  onLaunchApex: (ticker: string) => void;
}> = ({ catalyst, index, onLaunchApex }) => {
  const colors    = impactColor(catalyst.impact_score);
  const direction = DIRECTION_CONFIG[catalyst.direction] ?? DIRECTION_CONFIG.BULLISH;
  const { icon: catIcon, label: catLabel } = getCategoryDetails(catalyst.event_category);

  return (
    <div
      className={`
        relative rounded-xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm
        p-3 flex flex-col gap-2.5 animate-slide-up
        hover:border-slate-700 hover:bg-slate-900 transition-all duration-200
        ${direction.glow}
      `}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      {/* Card Header: Ticker + Direction + Impact */}
      <div className="flex items-center justify-between gap-2">
        {/* Ticker */}
        <span className="text-base font-bold font-mono text-white tracking-wide">
          {catalyst.ticker}
        </span>

        <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
          {/* Direction badge */}
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border tracking-wider ${direction.class}`}
          >
            {direction.label}
          </span>

          {/* Impact score badge */}
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border tracking-wider ${colors.badge}`}
          >
            {catalyst.impact_score}
          </span>
        </div>
      </div>

      {/* Impact Score Bar */}
      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
          style={{ width: `${catalyst.impact_score}%` }}
        />
      </div>

      {/* Category + Reason */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-mono text-slate-400 tracking-widest uppercase flex items-center gap-1">
          <span>{catIcon}</span>
          <span>{catLabel}</span>
        </span>
        <p className="text-xs text-slate-300 leading-relaxed">
          {catalyst.reason}
        </p>
      </div>

      {/* CTA: Analyze with APEX */}
      <button
        onClick={() => onLaunchApex(catalyst.ticker)}
        className="
          mt-0.5 w-full flex items-center justify-center gap-1.5
          py-1.5 px-3 rounded-lg text-[11px] font-mono font-bold tracking-wide
          bg-gradient-to-r from-violet-600/80 to-indigo-600/80
          hover:from-violet-500 hover:to-indigo-500
          border border-violet-500/30 hover:border-violet-400/50
          text-violet-100 hover:text-white
          transition-all duration-200
          shadow-[0_0_12px_rgba(124,58,237,0.2)] hover:shadow-[0_0_18px_rgba(124,58,237,0.4)]
          active:scale-[0.97]
        "
      >
        <span>⚡</span>
        <span>วิเคราะห์ด้วย APEX</span>
      </button>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CatalystRadar: React.FC<CatalystRadarProps> = ({ onLaunchApex }) => {
  const [status,    setStatus]    = useState<RadarStatus>("idle");
  const [catalysts, setCatalysts] = useState<CatalystResult[]>([]);
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);
  const [meta,      setMeta]      = useState<{ scanned_at?: string; headlines_used?: number }>({});

  const handleScan = useCallback(async () => {
    if (status === "scanning") return;

    setStatus("scanning");
    setCatalysts([]);
    setErrorMsg(null);
    setMeta({});

    try {
      const data = await fetchRadarScan();
      setCatalysts(data.catalysts ?? []);
      setMeta({ scanned_at: data.scanned_at, headlines_used: data.headlines_used });
      setStatus("done");
    } catch (err: unknown) {
      setErrorMsg((err as Error).message ?? "Unknown error occurred.");
      setStatus("error");
    }
  }, [status]);

  // ── Idle state ──────────────────────────────────────────────────────────────
  const showIdlePlaceholder = status === "idle";
  const showScanning        = status === "scanning";
  const showError           = status === "error";
  const showResults         = status === "done";

  return (
    <div className="flex flex-col gap-3 flex-1 h-0 overflow-hidden animate-fade-in">

      {/* ── Scan Button ────────────────────────────────────────────────────── */}
      <button
        onClick={handleScan}
        disabled={showScanning}
        id="catalyst-radar-scan-btn"
        className={`
          w-full flex items-center justify-center gap-2
          py-3 px-4 rounded-xl text-sm font-bold font-mono tracking-wide
          transition-all duration-300 shrink-0 relative overflow-hidden
          ${showScanning
            ? "bg-slate-800 border border-slate-700 text-slate-400 cursor-not-allowed"
            : `bg-gradient-to-r from-emerald-600 to-teal-600
               hover:from-emerald-500 hover:to-teal-500
               border border-emerald-500/30 hover:border-emerald-400/50
               text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]
               hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]
               active:scale-[0.98]`
          }
        `}
      >
        {/* Shimmer overlay */}
        {!showScanning && (
          <span
            className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
            }}
          />
        )}

        {showScanning ? (
          <>
            <span className="w-4 h-4 border-2 border-slate-500 border-t-emerald-400 rounded-full animate-spin" />
            <span>กำลังสแกน...</span>
          </>
        ) : (
          <>
            <span className="text-lg">🚀</span>
            <span>สแกนข่าวเด่น (Radar Scan)</span>
          </>
        )}
      </button>

      {/* ── Scanning Animation ─────────────────────────────────────────────── */}
      {showScanning && (
        <div className="flex flex-col items-center justify-center flex-1 py-8 animate-fade-in">
          <RadarSweep />
          <p className="text-sm font-mono text-emerald-400 font-bold tracking-wide">
            SCANNING MARKET NEWS
          </p>
          <p className="text-[11px] text-slate-400 mt-1.5 text-center font-mono">
            AI กำลังวิเคราะห์ข่าวตลาด<br />เพื่อหา Catalyst...
          </p>
          <div className="flex items-center gap-1 mt-3">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Error State ────────────────────────────────────────────────────── */}
      {showError && (
        <div className="card border-rose-500/40 bg-rose-950/30 text-rose-300 animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-rose-400 text-lg shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="text-xs font-bold font-mono text-rose-400 uppercase tracking-wider">
                Radar Scan Failed
              </p>
              <p className="text-xs text-slate-300 mt-1 font-mono leading-relaxed">
                {errorMsg ?? "An unknown error occurred during the radar scan."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Idle Placeholder ───────────────────────────────────────────────── */}
      {showIdlePlaceholder && (
        <div className="flex flex-col items-center justify-center flex-1 py-10 px-4 text-center border border-dashed border-slate-800/80 rounded-2xl bg-slate-900/30 backdrop-blur-sm animate-fade-in">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(0,255,136,0.12)] mb-3">
            <span className="text-2xl">🎯</span>
          </div>
          <h3 className="text-sm font-bold text-slate-100 font-mono tracking-tight">
            CATALYST RADAR
          </h3>
          <p className="text-xs text-slate-400 mt-1.5 max-w-[280px] leading-relaxed">
            กดปุ่ม <span className="text-emerald-400 font-mono">Radar Scan</span> เพื่อให้ AI สแกนข่าวตลาดและหา Catalyst ที่จะทำให้หุ้นเคลื่อนไหว
          </p>
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {showResults && (
        <div className="flex flex-col gap-2 flex-1 h-0 overflow-y-auto pr-0.5">
          {/* Meta bar */}
          <div className="flex items-center justify-between text-[10px] font-mono shrink-0">
            <span className="text-slate-400 uppercase tracking-widest">
              {catalysts.length} CATALYST{catalysts.length !== 1 ? "S" : ""} FOUND
            </span>
            <span className="text-slate-500">
              {meta.headlines_used} HEADLINES SCANNED
            </span>
          </div>

          {catalysts.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-10 text-center">
              <span className="text-4xl mb-3">🔍</span>
              <p className="text-sm font-mono text-slate-400">
                ไม่พบ Catalyst ที่มีนัยสำคัญในขณะนี้
              </p>
              <p className="text-xs text-slate-500 mt-1">ลองสแกนใหม่ภายหลัง</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pb-1">
              {catalysts.map((catalyst, i) => (
                <CatalystCard
                  key={`${catalyst.ticker}-${i}`}
                  catalyst={catalyst}
                  index={i}
                  onLaunchApex={onLaunchApex}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CatalystRadar;
