// ─────────────────────────────────────────────────────────────
// Sparkline Component — Plain React + SVG lightweight price chart
// Zero external chart library dependencies, crisp neon line & gradient
// ─────────────────────────────────────────────────────────────

import React from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  showMinMax?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 280,
  height = 48,
  className = "",
  showMinMax = true,
}) => {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-12 text-[10px] text-slate-500 font-mono">
        NO HISTORICAL CHART DATA
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const isUp = data[data.length - 1] >= data[0];

  const strokeColor = isUp ? "#10b981" : "#ef4444"; // Emerald or Crimson
  const gradientId = `sparkline-grad-${Math.random().toString(36).substr(2, 9)}`;

  // Convert price points into SVG coordinates with padding
  const paddingY = 4;
  const usableHeight = height - paddingY * 2;
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - paddingY - ((val - min) / range) * usableHeight;
    return { x, y, val };
  });

  const pathD = points.reduce(
    (acc, pt, i) => `${acc} ${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`,
    ""
  );

  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;

  const lastPoint = points[points.length - 1];

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="relative w-full overflow-hidden" style={{ height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Line Path */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Endpoint Pulse Dot */}
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="3"
            fill={strokeColor}
            className="animate-pulse"
          />
          <circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r="1.5"
            fill="#ffffff"
          />
        </svg>
      </div>

      {showMinMax && (
        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-0.5">
          <span>LOW: ${min.toFixed(2)}</span>
          <span>HIGH: ${max.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
};

export default Sparkline;
