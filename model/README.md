# Model Documentation — Unified Merchant Risk Engine

This directory contains the machine learning training pipeline, serialized model artifacts, and evaluation metrics for the Unified Merchant Risk Engine.

## Model Choice Rationale
We selected **RandomForestClassifier** with a **SHAP TreeExplainer** for this fintech application due to the following key reasons:
1. **Explainability & Transparency**: In fintech decisioning (onboarding & loan underwriting), black-box models are unacceptable for compliance and auditability. RandomForest naturally pairs with `shap.TreeExplainer` to extract exact, exact per-prediction feature contributions.
2. **Non-Linear Interactions**: Risk factors in merchant portfolios non-linearly interact (e.g., high chargebacks combined with young business age and incomplete KYC exponentially raises risk compared to isolated factors).
3. **Tabular Data Superiority**: Tree-based ensembles consistently outperform deep learning models on structured tabular datasets while remaining fast to train and inference.

## Feature Definitions
| Feature Name | Type | Description |
| :--- | :--- | :--- |
| `business_age_months` | Numeric | Operational tenure of the merchant in months (1–240). |
| `monthly_transaction_volume` | Numeric | Total monthly payment volume processed (in INR). |
| `avg_transaction_value` | Numeric | Average order / ticket size per transaction (in INR). |
| `transaction_growth_rate_pct` | Numeric | Month-over-month volume growth rate percentage (-50% to +200%). |
| `chargeback_rate_pct` | Numeric | Percentage of transactions flagged as chargebacks (0%–15%). |
| `failed_payment_rate_pct` | Numeric | Percentage of failed payment attempts (0%–30%). |
| `business_category` | Categorical | Business domain (e.g., grocery, crypto, gambling, saas, etc.). |
| `kyc_completeness_pct` | Numeric | Completion percentage of merchant KYC verification (0%–100%). |
| `credit_score` | Numeric | Business owner's credit score (CIBIL equivalent, 300–900). |
| `customer_complaint_rate_pct` | Numeric | Rate of customer dispute tickets logged (0%–10%). |

## Risk Score & Decision Matrix
The continuous risk score $S \in [0, 100]$ is computed directly from model class probabilities:
$$S = P(\text{Medium Risk}) \times 50 + P(\text{High Risk}) \times 100$$

| Score Range | Risk Tier | Onboarding Decision | Loan Interest Tier & Rate |
| :--- | :--- | :--- | :--- |
| **0 – 33** | **Low Risk** | `Approve` | Prime Tier (10.5% p.a.) |
| **34 – 66** | **Medium Risk** | `Manual Review` | Standard Tier (15.0% p.a.) |
| **67 – 100** | **High Risk** | `Reject` | Subprime / Ineligible (21.0% p.a.) |

## Evaluation Metrics Summary
The model was evaluated using both 5-Fold Stratified Cross-Validation on training data (`cv_metrics`) and a 20% held-out test split (`test_metrics`). Results are stored in `metrics.json`.
