// ─────────────────────────────────────────────────────────────
// RiskGauge Component — Visual half-circle SVG gauge for Risk Score (1-10)
// High-end institutional terminal aesthetic with dynamic glowing colors
// ─────────────────────────────────────────────────────────────

import React from "react";

interface RiskGaugeProps {
  score: number; // 1 - 10
  label?: string;
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score, label }) => {
  // Clamp score between 1 and 10
  const normalizedScore = Math.min(Math.max(score, 1), 10);

  // Calculate rotation angle for needle (-90 deg at 1, +90 deg at 10)
  // angle = -90 + (normalizedScore - 1) * (180 / 9)
  const angle = -90 + (normalizedScore - 1) * 20;

  // Determine risk category & colors
  let category = "LOW RISK";
  let colorHex = "#10b981"; // Emerald green
  let glowClass = "shadow-[0_0_12px_rgba(16,185,129,0.4)]";
  let textColor = "text-emerald-400";
  let badgeBg = "bg-emerald-950/80 border-emerald-800 text-emerald-300";

  if (normalizedScore >= 4 && normalizedScore <= 6) {
    category = "MODERATE RISK";
    colorHex = "#f59e0b"; // Amber
    glowClass = "shadow-[0_0_12px_rgba(245,158,11,0.4)]";
    textColor = "text-amber-400";
    badgeBg = "bg-amber-950/80 border-amber-800 text-amber-300";
  } else if (normalizedScore >= 7 && normalizedScore <= 8) {
    category = "HIGH RISK";
    colorHex = "#f97316"; // Orange/Red
    glowClass = "shadow-[0_0_12px_rgba(249,115,22,0.4)]";
    textColor = "text-orange-400";
    badgeBg = "bg-orange-950/80 border-orange-800 text-orange-300";
  } else if (normalizedScore >= 9) {
    category = "EXTREME RISK";
    colorHex = "#ef4444"; // Bright Crimson
    glowClass = "shadow-[0_0_15px_rgba(239,68,68,0.6)]";
    textColor = "text-rose-500 font-extrabold animate-pulse";
    badgeBg = "bg-rose-950/90 border-rose-800 text-rose-300";
  }

  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
      <div className="flex items-center justify-between w-full mb-1">
        <span className="text-[10px] uppercase font-mono font-medium tracking-widest text-slate-400">
          RISK ASSESSMENT
        </span>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeBg}`}>
          {category}
        </span>
      </div>

      <div className="relative w-36 h-20 flex items-end justify-center mt-1">
        {/* Arc Background & Colored Segments */}
        <svg viewBox="0 0 100 55" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="40%" stopColor="#f59e0b" />
              <stop offset="75%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Colored Value Arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Scale Ticks */}
          {[1, 3, 5, 7, 9, 10].map((num) => {
            const tickAngle = (-90 + (num - 1) * 20) * (Math.PI / 180);
            const x1 = 50 + 33 * Math.sin(tickAngle);
            const y1 = 50 - 33 * Math.cos(tickAngle);
            const x2 = 50 + 37 * Math.sin(tickAngle);
            const y2 = 50 - 37 * Math.cos(tickAngle);
            return (
              <line
                key={num}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#64748b"
                strokeWidth="1"
              />
            );
          })}

          {/* Center Hub */}
          <circle cx="50" cy="50" r="4" fill="#334155" />
          <circle cx="50" cy="50" r="2" fill={colorHex} />

          {/* Rotating Needle */}
          <g transform={`rotate(${angle}, 50, 50)`} className="transition-transform duration-700 ease-out">
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="15"
              stroke={colorHex}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        </svg>

        {/* Score Overlay inside arch */}
        <div className="absolute bottom-0 text-center flex flex-col items-center">
          <span className={`text-xl font-mono font-bold leading-none ${textColor} ${glowClass}`}>
            {normalizedScore}
            <span className="text-xs text-slate-500 font-normal">/10</span>
          </span>
        </div>
      </div>

      {label && (
        <p className="text-[10px] text-slate-400 mt-2 font-mono text-center">
          {label}
        </p>
      )}
    </div>
  );
};

export default RiskGauge;
