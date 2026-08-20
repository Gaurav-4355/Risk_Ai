import React from 'react';
import { ShieldAlert, ShieldCheck, Zap, Activity } from 'lucide-react';

export default function Header({ apiHealthy }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-xl shadow-lg shadow-indigo-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Unified Merchant Risk Engine
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Razorpay Edition
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              2-in-1 Decisioning: Instant Onboarding Approval & Automated Credit Underwriting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-auto">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
            apiHealthy 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <Activity className={`w-3.5 h-3.5 ${apiHealthy ? 'animate-pulse' : ''}`} />
            <span>API Status: {apiHealthy ? 'Connected (Port 8000)' : 'Disconnected'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
