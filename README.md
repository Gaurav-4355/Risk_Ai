# Unified Merchant Risk Engine

A full-stack, production-grade Machine Learning solution designed for fintech platforms (Razorpay-style payment aggregators). 

This platform evaluates merchant risk using a single Machine Learning scoring engine to solve **two critical financial decisions simultaneously**:
1. **Merchant Onboarding Approval**: Instant automated risk tiering (`Approve`, `Manual Review`, `Reject`).
2. **Business Loan Underwriting**: Automated credit limit recommendation & interest rate tiering.

---

## 1. Decision & Threshold Matrix

| Risk Score Range | Risk Tier | Onboarding Decision | Loan Interest Tier & Rate | Max Loan Recommendation Formula |
| :--- | :--- | :--- | :--- | :--- |
| **0 – 33** | **Low Risk** | `Approve` | **Prime Tier (10.5% p.a.)** | $\text{Monthly Turnover} \times 3 \times \left(1 - \frac{\text{Risk Score}}{100}\right)$ |
| **34 – 66** | **Medium Risk** | `Manual Review` | **Standard Tier (15.0% p.a.)** | $\text{Monthly Turnover} \times 3 \times \left(1 - \frac{\text{Risk Score}}{100}\right)$ |
| **67 – 100** | **High Risk** | `Reject` | **Subprime Tier (21.0% p.a. / Ineligible)** | ₹0.00 (Ineligible) |

> **Underwriting Eligibility Rule**: Merchant must have a `Risk Score <= 66` and `KYC Completeness >= 70%` to qualify for business loans.

---

## 2. Architecture Overview

```
                        +----------------------------------------+
                        |        React + Tailwind Frontend       |
                        | (Fintech Dark Dashboard UI, Form,      |
                        | Gauge Chart, SHAP Bar Chart, Loan Cards)|
                        +-------------------+--------------------+
                                            |
                                  REST API (JSON)
                                            |
                        +-------------------v--------------------+
                        |           FastAPI Backend              |
                        |      (/score-merchant, /sample-merchants)|
                        +-------------------+--------------------+
                                            |
                   +------------------------+------------------------+
                   |                                                 |
        +----------v----------+                           +----------v----------+
        | RandomForest Classifier |                           |  SHAP TreeExplainer  |
        |  (3-Class Risk Model)   |                           | (Categorical Summed) |
        +---------------------+                           +---------------------+
                   |                                                 |
                   +------------------------+------------------------+
                                            |
                                  +---------v----------+
                                  | Merchant Risk Score|
                                  |    (0 - 100)       |
                                  +---------+----------+
                                            |
                   +------------------------+------------------------+
                   |                                                 |
        +----------v----------+                           +----------v----------+
        | Onboarding Decision |                           | Underwriting Engine |
        | (Approve/Review/    |                           | (Max Loan & Interest|
        |  Reject)            |                           |  Rate Calculation)  |
        +---------------------+                           +---------------------+
```

---

## 3. Synthetic Dataset & Features

The dataset (`data/merchant_data.csv`) contains 3,500 synthetic merchant profiles reflecting realistic Indian fintech metrics:

| Feature Name | Type | Bounds | Description |
| :--- | :--- | :--- | :--- |
| `business_age_months` | Numeric | 0 – 600 | Operational tenure of the merchant in months. |
| `monthly_transaction_volume` | Numeric | $\ge 0$ | Total monthly payment volume processed (in INR ₹). |
| `avg_transaction_value` | Numeric | $\ge 0$ | Average ticket size per transaction (in INR ₹). |
| `transaction_growth_rate_pct` | Numeric | -100 to 1000 | Month-over-month volume growth rate percentage. |
| `chargeback_rate_pct` | Numeric | 0 – 100% | Percentage of transactions flagged as chargebacks. |
| `failed_payment_rate_pct` | Numeric | 0 – 100% | Percentage of failed payment attempts. |
| `business_category` | Categorical | 10 domains | Business sector (`saas`, `grocery`, `crypto`, `gambling`, etc.). |
| `kyc_completeness_pct` | Numeric | 0 – 100% | Percentage of merchant KYC verification completed. |
| `credit_score` | Numeric | 300 – 900 | Business owner CIBIL-equivalent credit score. |
| `customer_complaint_rate_pct`| Numeric | 0 – 100% | Customer dispute ticket logging rate. |

---

## 4. Model Explainability & Business Analysis

### Why RandomForest + SHAP TreeExplainer?
- **No Black Box**: In payment processing and lending, automated rejections require regulatory explainability. TreeExplainer computes exact per-prediction feature contributions.
- **Categorical SHAP Aggregation**: Raw one-hot dummy columns (`business_category_crypto`, `business_category_saas`) are dynamically aggregated by summing their SHAP attributions into a single feature contribution (`business_category`).

### Top 3 Most Important Features & Business Rationale:

1. **Chargeback Rate (%)**:
   - *Why it matters*: Chargebacks directly expose payment processors to financial loss and card scheme fines (Visa/Mastercard penalties above 1% ratio). High chargeback rates strongly push the score upward into "High Risk".
2. **KYC Verification Completeness (%)**:
   - *Why it matters*: Incomplete KYC is a strong proxy for shell businesses and potential money laundering / fraud. Full verification (100%) acts as a major risk reducer (- score points).
3. **Credit Score (CIBIL 300-900)**:
   - *Why it matters*: Reflects the financial discipline and repayment history of the merchant's promoters. High credit scores (>750) significantly boost loan eligibility and lower default probability.

---

## 5. Local Setup & Execution Guide

### Prerequisites
- Python 3.10+
- Node.js 18+

### Step 1: Generate Dataset
```bash
python data/generate_data.py
```

### Step 2: Train Model & Export SHAP Explainer
```bash
python model/train_model.py
```

### Step 3: Run Backend Test Suite
```bash
python -m pytest tests/test_backend.py
```

### Step 4: Launch FastAPI Backend
```bash
uvicorn backend.main:app --reload --port 8000
```
*Backend API docs available at `http://127.0.0.1:8000/docs`.*

### Step 5: Launch React Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
*Frontend opens at `http://localhost:5173`.*

---

## 6. Project Structure

```
/Risk_Ai
├── data/
│   ├── generate_data.py      # Synthetic dataset generation script (3500 rows)
│   └── merchant_data.csv     # Generated merchant dataset
├── model/
│   ├── train_model.py        # ML training script (RandomForest + CV + SHAP)
│   ├── model_artifacts.pkl   # Serialized model, preprocessor & SHAP explainer
│   ├── metrics.json          # CV & Test set metrics (accuracy, precision, F1)
│   └── README.md             # Model technical documentation
├── backend/
│   └── main.py               # FastAPI application with Pydantic validation
├── tests/
│   └── test_backend.py       # Unit tests (score boundaries 33, 34, 66, 67 & 422 bounds)
├── frontend/
│   ├── src/
│   │   ├── components/       # Header, RiskGauge, DecisionCards, ShapChart
│   │   ├── App.jsx           # Main React Dashboard
│   │   └── index.css         # Tailwind CSS v4 styling
│   └── package.json
└── README.md                 # Complete project documentation
```
