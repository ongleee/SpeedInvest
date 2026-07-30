// ─────────────────────────────────────────────────────────────────
// TickerInput — stock ticker form with preset chips & enter shortcut
// ─────────────────────────────────────────────────────────────────
import React, { useRef } from "react";

interface TickerInputProps {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  disabled: boolean;
}

const PRESET_TICKERS = ["NVDA", "TSLA", "AAPL", "GULF.BK", "PTT.BK", "PLTR"];

const TickerInput: React.FC<TickerInputProps> = ({
  value,
  onChange,
  onAnalyze,
  disabled,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onAnalyze();
  };

  const handleSelectPreset = (symbol: string) => {
    onChange(symbol);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] uppercase tracking-widest text-slate-400 font-mono font-medium flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Stock Symbol
        </label>
        <span className="text-[10px] text-slate-500 font-mono">Press Enter ↵</span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            className="input-ticker"
            placeholder="e.g. NVDA, AAPL, GULF.BK…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            maxLength={14}
            autoFocus
            spellCheck={false}
            aria-label="Stock ticker symbol"
          />
          {value && !disabled && (
            <button
              onClick={() => onChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs p-1"
              title="Clear symbol"
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={onAnalyze}
          disabled={disabled || !value.trim()}
          className="btn-primary"
          aria-label="Analyze stock"
        >
          {disabled ? (
            <span className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="3"
                  className="opacity-25"
                />
                <path
                  d="M4 12a8 8 0 018-8"
                  stroke="currentColor" strokeWidth="3"
                  strokeLinecap="round"
                  className="opacity-75"
                />
              </svg>
              Running
            </span>
          ) : (
            "Analyze"
          )}
        </button>
      </div>

      {/* Preset Ticker Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
        <span className="text-[10px] text-slate-500 font-mono shrink-0">Popular:</span>
        {PRESET_TICKERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleSelectPreset(t)}
            disabled={disabled}
            className={`ticker-chip ${value.toUpperCase() === t ? 'border-emerald-500 text-emerald-300 bg-slate-800' : ''}`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TickerInput;

