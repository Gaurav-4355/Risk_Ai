import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, IndianRupee, ShieldCheck, TrendingUp, Info } from 'lucide-react';

export default function DecisionCards({ result, monthlyVolume }) {
  if (!result) return null;

  const { onboarding_decision, loan_recommendation, risk_score } = result;

  // Onboarding decision styling
  let decisionConfig = {
    title: "APPROVED FOR INSTANT ONBOARDING",
    badge: "Approve",
    colorClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />,
    desc: "Merchant profile satisfies low-risk compliance metrics. Instant payment gateway activation enabled."
  };

  if (onboarding_decision === "Manual Review") {
    decisionConfig = {
      title: "MANUAL COMPLIANCE REVIEW REQUIRED",
      badge: "Manual Review",
      colorClass: "bg-amber-500/10 border-amber-500/30 text-amber-400",
      icon: <AlertTriangle className="w-8 h-8 text-amber-400" />,
      desc: "Moderate risk signals detected. Automated hold placed pending Underwriting Risk Officer sign-off."
    };
  } else if (onboarding_decision === "Reject") {
    decisionConfig = {
      title: "ONBOARDING REJECTED",
      badge: "Reject",
      colorClass: "bg-rose-500/10 border-rose-500/30 text-rose-400",
      icon: <XCircle className="w-8 h-8 text-rose-400" />,
      desc: "Critical risk thresholds exceeded. High chargeback or regulatory fraud probability detected."
    };
  }

  // Format currency in INR
  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const baseEligible = (monthlyVolume || 0) * 3;
  const riskAdjFactor = Math.max(0, 1 - (risk_score / 100));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. Onboarding Approval Card */}
      <div className={`p-6 rounded-2xl border ${decisionConfig.colorClass} shadow-xl flex flex-col justify-between`}>
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Decision #1: Merchant Onboarding
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${decisionConfig.colorClass}`}>
              {decisionConfig.badge}
            </span>
          </div>

          <div className="flex items-start gap-4">
            {decisionConfig.icon}
            <div>
              <h3 className="text-lg font-bold text-white leading-snug">
                {decisionConfig.title}
              </h3>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {decisionConfig.desc}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span>Automated Policy Rule:</span>
          <span className="font-semibold text-slate-200">
            {risk_score < 34 ? "Score < 34 (Approve)" : risk_score <= 66 ? "Score 34-66 (Manual)" : "Score > 66 (Reject)"}
          </span>
        </div>
      </div>

      {/* 2. Business Loan Recommendation Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-400" /> Decision #2: Business Loan Underwriting
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
              loan_recommendation.eligible 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}>
              {loan_recommendation.eligible ? 'Eligible' : 'Ineligible'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Recommended Max Credit Limit</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white tracking-tight">
                  {formatINR(loan_recommendation.max_loan_amount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Interest Rate Tier</span>
                <span className="text-xs font-bold text-indigo-400 mt-0.5 block">
                  {loan_recommendation.interest_tier}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Risk Adjustment Factor</span>
                <span className="text-xs font-bold text-emerald-400 mt-0.5 block">
                  {(riskAdjFactor * 100).toFixed(1)}% (1 - Score/100)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Loan Formula Transparency Note */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            Formula: Base ({formatINR(baseEligible)}) × Risk Adjustment ({(riskAdjFactor).toFixed(2)})
          </span>
        </div>
      </div>
    </div>
  );
}
