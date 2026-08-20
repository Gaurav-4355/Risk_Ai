import React from 'react';

export default function RiskGauge({ score, tier }) {
  // Score is 0 to 100
  const clampedScore = Math.max(0, Math.min(100, score || 0));

  // Determine color scheme based on risk tier
  let strokeColor = "#10b981"; // Emerald
  let glowColor = "rgba(16, 185, 129, 0.4)";
  let badgeBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  let tierLabel = "LOW RISK";

  if (clampedScore >= 67) {
    strokeColor = "#f43f5e"; // Crimson / Rose
    glowColor = "rgba(244, 63, 94, 0.4)";
    badgeBg = "bg-rose-500/10 text-rose-400 border-rose-500/30";
    tierLabel = "HIGH RISK";
  } else if (clampedScore >= 34) {
    strokeColor = "#f59e0b"; // Amber
    glowColor = "rgba(245, 158, 11, 0.4)";
    badgeBg = "bg-amber-500/10 text-amber-400 border-amber-500/30";
    tierLabel = "MEDIUM RISK";
  }

  // Exact Semi-circle SVG Math
  // Radius R = 75, Center = (100, 95)
  // Arc starts at (25, 95) and ends at (175, 95)
  const radius = 75;
  const strokeWidth = 14;
  const arcLength = Math.PI * radius; // ~235.62
  const progressOffset = arcLength - (clampedScore / 100) * arcLength;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/70 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
        Composite Risk Score
      </h3>

      {/* Gauge SVG Container */}
      <div className="relative w-64 h-36 flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 200 115">
          {/* Background Track Arc */}
          <path
            d="M 25,95 A 75,75 0 0,1 175,95"
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Dynamic Progress Arc */}
          <path
            d="M 25,95 A 75,75 0 0,1 175,95"
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease",
              filter: `drop-shadow(0 0 10px ${glowColor})`
            }}
          />
        </svg>

        {/* Centered Score Readout inside Arc */}
        <div className="absolute top-10 flex flex-col items-center">
          <span className="text-4xl font-black text-white tracking-tight">
            {clampedScore.toFixed(1)}
          </span>
          <span className="text-[10px] text-slate-500 font-extrabold tracking-widest uppercase mt-0.5">
            OUT OF 100
          </span>
        </div>
      </div>

      {/* Tier Badge below Gauge Arc */}
      <div className={`mt-1 px-4 py-1 rounded-full text-xs font-extrabold tracking-wide border ${badgeBg} shadow-sm`}>
        {tierLabel} ({tier || 'Calculated'})
      </div>

      {/* Score Range Legend */}
      <div className="w-full grid grid-cols-3 text-center text-[10px] text-slate-500 font-semibold mt-5 pt-3 border-t border-slate-800/80">
        <span className="text-emerald-400 font-bold">0-33: Low Risk</span>
        <span className="text-amber-400 font-bold">34-66: Medium</span>
        <span className="text-rose-400 font-bold">67-100: High Risk</span>
      </div>
    </div>
  );
}
