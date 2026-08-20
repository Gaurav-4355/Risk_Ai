import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import RiskGauge from './components/RiskGauge';
import DecisionCards from './components/DecisionCards';
import ShapChart from './components/ShapChart';
import { RefreshCw, Play, Sparkles, Building2, Shield, DollarSign, Layers } from 'lucide-react';

const DEFAULT_MERCHANT = {
  business_age_months: 36,
  monthly_transaction_volume: 1200000.0,
  avg_transaction_value: 1500.0,
  transaction_growth_rate_pct: 18.5,
  chargeback_rate_pct: 0.35,
  failed_payment_rate_pct: 3.2,
  business_category: "saas",
  kyc_completeness_pct: 100.0,
  credit_score: 780,
  customer_complaint_rate_pct: 0.4
};

const CATEGORIES = [
  { id: 'grocery', name: 'Grocery & Supermarket' },
  { id: 'education', name: 'Education & EdTech' },
  { id: 'electronics', name: 'Electronics & Gadgets' },
  { id: 'gambling', name: 'Online Gambling & Gaming' },
  { id: 'crypto', name: 'Cryptocurrency & Virtual Assets' },
  { id: 'fashion', name: 'Fashion & Apparel' },
  { id: 'food_delivery', name: 'Food Delivery & Q-Commerce' },
  { id: 'healthcare', name: 'Healthcare & Pharma' },
  { id: 'travel', name: 'Travel & Ticketing' },
  { id: 'saas', name: 'Software & SaaS' }
];

export default function App() {
  const [formData, setFormData] = useState(DEFAULT_MERCHANT);
  const [sampleList, setSampleList] = useState([]);
  const [selectedSample, setSelectedSample] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [apiHealthy, setApiHealthy] = useState(false);

  const API_BASE = "http://127.0.0.1:8000";

  // 1. Check API Health & Fetch Sample Merchants on mount
  useEffect(() => {
    checkHealth();
    fetchSamples();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) {
        const data = await res.json();
        setApiHealthy(data.status === "healthy");
      } else {
        setApiHealthy(false);
      }
    } catch (err) {
      setApiHealthy(false);
    }
  };

  const fetchSamples = async () => {
    try {
      const res = await fetch(`${API_BASE}/sample-merchants`);
      if (res.ok) {
        const data = await res.json();
        setSampleList(data);
      }
    } catch (err) {
      console.error("Failed to load sample merchants", err);
    }
  };

  // Handle Preset Sample Selection
  const handleSampleChange = (e) => {
    const val = e.target.value;
    setSelectedSample(val);
    if (val !== "") {
      const found = sampleList.find(s => s.name === val);
      if (found) {
        setFormData(found.data);
        setErrorMsg("");
      }
    }
  };

  // Form Input Change Handler
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let parsedVal = value;

    if (type === 'number' || name.endsWith('_pct') || name.endsWith('_months') || name.endsWith('_score') || name.endsWith('_volume') || name.endsWith('_value')) {
      parsedVal = value === "" ? 0 : parseFloat(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: parsedVal
    }));
  };

  // Submit Handler -> POST /score-merchant
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${API_BASE}/score-merchant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const errData = await res.json();
        if (errData.detail && Array.isArray(errData.detail)) {
          const formattedErrs = errData.detail.map(d => `${d.loc.join('.')}: ${d.msg}`).join(' | ');
          throw new Error(`Validation Error: ${formattedErrs}`);
        } else {
          throw new Error(errData.detail || "Scoring request failed");
        }
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setErrorMsg(err.message || "Could not connect to backend server on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  // Pre-trigger score evaluation on initial load
  useEffect(() => {
    handleSubmit(new Event('submit'));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Header apiHealthy={apiHealthy} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Preset Bar */}
        <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Quick Demo Presets
              </span>
              <span className="text-xs text-slate-400">
                Load pre-built merchant risk profiles to test decision boundaries.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedSample}
              onChange={handleSampleChange}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64"
            >
              <option value="">-- Load Sample Merchant --</option>
              {sampleList.map((s, idx) => (
                <option key={idx} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => { setFormData(DEFAULT_MERCHANT); setSelectedSample(""); setErrorMsg(""); }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-medium text-slate-300 transition-colors flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>

        {/* Main Grid: Left = Form, Right = Analysis Output */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Merchant Profile Input Form (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/70 p-6 rounded-2xl border border-slate-800 shadow-xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" /> Merchant Financial Profile
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter transactional, operational, and credit parameters.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Business Industry Category
                </label>
                <select
                  name="business_category"
                  value={formData.business_category}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Monthly Volume */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Monthly Transaction Volume (INR ₹)
                  </label>
                  <span className="text-[11px] font-mono font-bold text-indigo-400">
                    ₹{Number(formData.monthly_transaction_volume || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <input
                  type="number"
                  name="monthly_transaction_volume"
                  min="0"
                  step="50000"
                  value={formData.monthly_transaction_volume}
                  onChange={handleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Avg Transaction Value & Growth % */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Avg Ticket Size (₹)
                  </label>
                  <input
                    type="number"
                    name="avg_transaction_value"
                    min="0"
                    value={formData.avg_transaction_value}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    MoM Growth (%)
                  </label>
                  <input
                    type="number"
                    name="transaction_growth_rate_pct"
                    min="-100"
                    max="1000"
                    step="0.5"
                    value={formData.transaction_growth_rate_pct}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Chargebacks & Failed Payments */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Chargeback Rate (%)
                  </label>
                  <input
                    type="number"
                    name="chargeback_rate_pct"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.chargeback_rate_pct}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Failed Payment (%)
                  </label>
                  <input
                    type="number"
                    name="failed_payment_rate_pct"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.failed_payment_rate_pct}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Business Age & KYC Completeness */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Business Age (Months)
                  </label>
                  <input
                    type="number"
                    name="business_age_months"
                    min="0"
                    max="600"
                    value={formData.business_age_months}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    KYC Verification (%)
                  </label>
                  <input
                    type="number"
                    name="kyc_completeness_pct"
                    min="0"
                    max="100"
                    value={formData.kyc_completeness_pct}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Credit Score & Complaints */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Credit Score (300-900)
                  </label>
                  <input
                    type="number"
                    name="credit_score"
                    min="300"
                    max="900"
                    value={formData.credit_score}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Dispute Rate (%)
                  </label>
                  <input
                    type="number"
                    name="customer_complaint_rate_pct"
                    min="0"
                    max="100"
                    step="0.1"
                    value={formData.customer_complaint_rate_pct}
                    onChange={handleChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Evaluating ML Risk & Underwriting...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" /> Run Risk Engine & Underwriting
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Dynamic Analysis Dashboard (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {result ? (
              <>
                {/* Radial Gauge Card */}
                <RiskGauge score={result.risk_score} tier={result.risk_tier} />

                {/* Onboarding & Loan Underwriting Cards */}
                <DecisionCards result={result} monthlyVolume={formData.monthly_transaction_volume} />

                {/* SHAP Factor Contribution Bar Chart */}
                <ShapChart factors={result.top_risk_factors} />
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 text-center">
                <Shield className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-300">Ready to Score Merchant</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Select a demo preset or edit the financial metrics on the left, then click "Run Risk Engine".
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
