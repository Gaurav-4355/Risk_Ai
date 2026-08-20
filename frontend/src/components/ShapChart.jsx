import React from 'react';
import { ArrowUpRight, ArrowDownRight, HelpCircle } from 'lucide-react';

export default function ShapChart({ factors }) {
  if (!factors || factors.length === 0) return null;

  // Find max absolute contribution for bar scaling
  const maxAbsContrib = Math.max(...factors.map(f => Math.abs(f.contribution)), 1.0);

  // Friendly display names mapping
  const featureLabels = {
    business_age_months: "Business Age (Months)",
    monthly_transaction_volume: "Monthly Volume (INR)",
    avg_transaction_value: "Avg Order Value",
    transaction_growth_rate_pct: "MoM Growth Rate (%)",
    chargeback_rate_pct: "Chargeback Rate (%)",
    failed_payment_rate_pct: "Failed Payment Rate (%)",
    business_category: "Business Industry Sector",
    kyc_completeness_pct: "KYC Verification (%)",
    credit_score: "Credit Score (CIBIL)",
    customer_complaint_rate_pct: "Customer Dispute Rate (%)"
  };

  return (
    <div className="p-6 bg-slate-900/70 rounded-2xl border border-slate-800 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Top 5 Risk Contributing Factors (SHAP TreeExplainer)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Feature-level SHAP attributions explaining individual score movement (aggregated from category dummy vectors).
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> Increases Risk (+)
          </span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Decreases Risk (-)
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {factors.map((item, idx) => {
          const isIncrease = item.direction === "increases_risk";
          const absContrib = Math.abs(item.contribution);
          const barPercent = Math.min(100, (absContrib / maxAbsContrib) * 100);

          const displayName = featureLabels[item.feature] || item.feature;

          return (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-850">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-slate-200 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 text-[10px] flex items-center justify-center font-bold">
                    #{idx + 1}
                  </span>
                  {displayName}
                  <span className="text-[10px] text-slate-500 font-normal">({item.feature})</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold ${isIncrease ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {isIncrease ? `+${absContrib.toFixed(2)}` : `-${absContrib.toFixed(2)}`} pts
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                    isIncrease ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {isIncrease ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {isIncrease ? 'Increases Risk' : 'Reduces Risk'}
                  </span>
                </div>
              </div>

              {/* Bar visualization */}
              <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isIncrease 
                      ? 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-sm shadow-rose-500/50' 
                      : 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-sm shadow-emerald-500/50'
                  }`}
                  style={{ width: `${Math.max(5, barPercent)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
