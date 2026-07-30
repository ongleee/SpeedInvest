// ─────────────────────────────────────────────
// Header component — logo + status & action buttons
// ─────────────────────────────────────────────
import React from "react";

interface HeaderProps {
  onReset: () => void;
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset, onOpenSettings }) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl shrink-0">
      <div className="flex items-center gap-3">
        {/* Logo mark */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-[0_0_15px_rgba(52,211,153,0.35)] shrink-0">
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-950" aria-hidden="true">
            <path d="M3 17l4-8 4 5 3-3 4 6H3z" />
          </svg>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold leading-none tracking-tight text-white font-mono">
              SpeedInvest
            </p>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-emerald-950/80 border border-emerald-500/30 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              v1.0
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-none mt-1 tracking-wider uppercase font-mono">
            QUANT STOCK ANALYZER
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Reset / New analysis button */}
        <button
          onClick={onReset}
          title="New Analysis"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-700 transition-all text-xs font-mono"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
            <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
          </svg>
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title="Terminal Settings"
          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white border border-transparent hover:border-slate-700 transition-all"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
            <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;

