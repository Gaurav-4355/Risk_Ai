import os
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any

# ---------------------------------------------------------
# 1. Pydantic Input Schema with Strict Field Validation
# ---------------------------------------------------------
class MerchantInput(BaseModel):
    business_age_months: int = Field(..., ge=0, le=600, description="Business age in months (0-600)")
    monthly_transaction_volume: float = Field(..., ge=0.0, description="Monthly transaction volume in INR (>= 0)")
    avg_transaction_value: float = Field(..., ge=0.0, description="Average transaction value in INR (>= 0)")
    transaction_growth_rate_pct: float = Field(..., ge=-100.0, le=1000.0, description="MoM transaction growth rate % (-100 to 1000)")
    chargeback_rate_pct: float = Field(..., ge=0.0, le=100.0, description="Chargeback rate % (0-100)")
    failed_payment_rate_pct: float = Field(..., ge=0.0, le=100.0, description="Failed payment rate % (0-100)")
    business_category: str = Field(..., description="Business category domain")
    kyc_completeness_pct: float = Field(..., ge=0.0, le=100.0, description="KYC completeness % (0-100)")
    credit_score: int = Field(..., ge=300, le=900, description="CIBIL equivalent credit score (300-900)")
    customer_complaint_rate_pct: float = Field(..., ge=0.0, le=100.0, description="Customer complaint rate % (0-100)")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "business_age_months": 36,
                "monthly_transaction_volume": 1200000.0,
                "avg_transaction_value": 1500.0,
                "transaction_growth_rate_pct": 18.5,
                "chargeback_rate_pct": 0.35,
                "failed_payment_rate_pct": 3.2,
                "business_category": "saas",
                "kyc_completeness_pct": 100.0,
                "credit_score": 780,
                "customer_complaint_rate_pct": 0.4
            }
        }
    )

# Response Schemas
class RiskFactor(BaseModel):
    feature: str
    contribution: float
    direction: str

class LoanRecommendation(BaseModel):
    eligible: bool
    max_loan_amount: float
    interest_tier: str

class RiskScoreResponse(BaseModel):
    risk_score: float
    risk_tier: str
    top_risk_factors: List[RiskFactor]
    onboarding_decision: str
    loan_recommendation: LoanRecommendation

# ---------------------------------------------------------
# 2. FastAPI Application Initialization & Model Loading
# ---------------------------------------------------------
app = FastAPI(
    title="Unified Merchant Risk Engine API",
    description="2-in-1 Merchant Onboarding & Loan Underwriting Risk Decision Engine",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for loaded artifacts
model = None
preprocessor = None
feature_names = None
explainer = None

MODEL_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model", "model_artifacts.pkl"))

def load_artifacts():
    global model, preprocessor, feature_names, explainer
    if os.path.exists(MODEL_PATH):
        artifacts = joblib.load(MODEL_PATH)
        model = artifacts["model"]
        preprocessor = artifacts["preprocessor"]
        feature_names = artifacts["feature_names"]
        explainer = artifacts["explainer"]
        print("Model artifacts successfully loaded.")
    else:
        print(f"Warning: Model artifacts not found at {MODEL_PATH}")

@app.on_event("startup")
def startup_event():
    load_artifacts()

# ---------------------------------------------------------
# 3. Helper Functions: SHAP Aggregation & Decision Logic
# ---------------------------------------------------------
def aggregate_shap_contributions(X_transformed, explainer, feature_names) -> List[Dict[str, Any]]:
    """
    Computes SHAP feature importance for a single sample and aggregates one-hot 
    encoded categorical features (e.g. business_category_crypto -> business_category).
    """
    raw_shap = explainer.shap_values(X_transformed)
    
    # Handle SHAP output shapes for multi-class classifiers
    if isinstance(raw_shap, list):
        # List of matrices per class [class0, class1, class2]
        # Contribution to continuous risk score = P(Med)*50 + P(High)*100
        shap_class1 = raw_shap[1][0]
        shap_class2 = raw_shap[2][0]
        shap_contributions = shap_class1 * 50.0 + shap_class2 * 100.0
    elif isinstance(raw_shap, np.ndarray) and raw_shap.ndim == 3:
        # Array shape (samples, features, classes)
        shap_class1 = raw_shap[0, :, 1]
        shap_class2 = raw_shap[0, :, 2]
        shap_contributions = shap_class1 * 50.0 + shap_class2 * 100.0
    else:
        shap_contributions = raw_shap[0]

    # Aggregate one-hot columns back into original human-readable feature names
    feature_impacts = {}
    for feat_name, impact in zip(feature_names, shap_contributions):
        if feat_name.startswith("business_category_"):
            clean_name = "business_category"
        else:
            clean_name = feat_name
            
        feature_impacts[clean_name] = feature_impacts.get(clean_name, 0.0) + float(impact)

    # Convert to structured list
    factors = []
    for feat, contrib in feature_impacts.items():
        contrib_val = round(contrib, 2)
        direction = "increases_risk" if contrib_val > 0 else "decreases_risk"
        factors.append({
            "feature": feat,
            "contribution": contrib_val,
            "direction": direction,
            "abs_impact": abs(contrib_val)
        })

    # Sort by absolute SHAP contribution descending and take top 5
    factors.sort(key=lambda x: x["abs_impact"], reverse=True)
    
    top_5 = [
        {
            "feature": f["feature"],
            "contribution": f["contribution"],
            "direction": f["direction"]
        }
        for f in factors[:5]
    ]
    return top_5

def compute_decision_and_loan(risk_score: float, monthly_volume: float, kyc_pct: float) -> Dict[str, Any]:
    """
    Applies explicit decision boundaries for onboarding and underwriting.
    """
    # 1. Onboarding Decision & Risk Tier
    if risk_score < 34.0:
        risk_tier = "Low"
        onboarding_decision = "Approve"
        interest_tier = "Low Risk (10.5% p.a. Prime Tier)"
    elif risk_score <= 66.0:
        risk_tier = "Medium"
        onboarding_decision = "Manual Review"
        interest_tier = "Medium Risk (15.0% p.a. Standard Tier)"
    else:
        risk_tier = "High"
        onboarding_decision = "Reject"
        interest_tier = "High Risk (21.0% p.a. Subprime / Ineligible)"

    # 2. Loan Underwriting Logic
    eligible = (risk_score <= 66.0) and (kyc_pct >= 70.0)
    
    if eligible:
        base_eligible_amount = monthly_volume * 3.0
        risk_adjustment_factor = max(0.0, 1.0 - (risk_score / 100.0))
        max_loan_amount = round(base_eligible_amount * risk_adjustment_factor, 2)
    else:
        max_loan_amount = 0.0

    return {
        "risk_tier": risk_tier,
        "onboarding_decision": onboarding_decision,
        "loan_recommendation": {
            "eligible": eligible,
            "max_loan_amount": max_loan_amount,
            "interest_tier": interest_tier
        }
    }

# ---------------------------------------------------------
# 4. API Endpoints
# ---------------------------------------------------------
@app.get("/health")
def health_check():
    if model is None:
        load_artifacts()
    return {
        "status": "healthy",
        "model_loaded": model is not None
    }

@app.post("/score-merchant", response_model=RiskScoreResponse)
def score_merchant(merchant: MerchantInput):
    if model is None or preprocessor is None or explainer is None:
        load_artifacts()
        if model is None:
            raise HTTPException(status_code=500, detail="Model artifacts could not be loaded.")
    
    # Convert input pydantic model to DataFrame
    input_dict = merchant.model_dump()
    df_input = pd.DataFrame([input_dict])
    
    # Preprocess
    X_transformed = preprocessor.transform(df_input)
    
    # Predict Probabilities
    probas = model.predict_proba(X_transformed)[0]
    p_med = float(probas[1])
    p_high = float(probas[2])
    
    # Compute Continuous Risk Score (0-100)
    raw_score = p_med * 50.0 + p_high * 100.0
    risk_score = round(float(np.clip(raw_score, 0.0, 100.0)), 2)
    
    # Compute Top SHAP Risk Factors (with One-Hot Aggregation)
    top_risk_factors = aggregate_shap_contributions(X_transformed, explainer, feature_names)
    
    # Decision & Underwriting
    decision_data = compute_decision_and_loan(
        risk_score=risk_score,
        monthly_volume=merchant.monthly_transaction_volume,
        kyc_pct=merchant.kyc_completeness_pct
    )
    
    return {
        "risk_score": risk_score,
        "risk_tier": decision_data["risk_tier"],
        "top_risk_factors": top_risk_factors,
        "onboarding_decision": decision_data["onboarding_decision"],
        "loan_recommendation": decision_data["loan_recommendation"]
    }

@app.get("/sample-merchants")
def get_sample_merchants():
    """
    Returns pre-configured sample merchant profiles spanning low, medium, and high risk cases.
    """
    samples = [
        {
            "name": "CloudTech Solutions (Low Risk SaaS)",
            "data": {
                "business_age_months": 48,
                "monthly_transaction_volume": 2500000.0,
                "avg_transaction_value": 4500.0,
                "transaction_growth_rate_pct": 25.0,
                "chargeback_rate_pct": 0.15,
                "failed_payment_rate_pct": 1.8,
                "business_category": "saas",
                "kyc_completeness_pct": 100.0,
                "credit_score": 810,
                "customer_complaint_rate_pct": 0.2
            }
        },
        {
            "name": "FreshMart Organics (Low Risk Retail)",
            "data": {
                "business_age_months": 36,
                "monthly_transaction_volume": 1200000.0,
                "avg_transaction_value": 850.0,
                "transaction_growth_rate_pct": 12.0,
                "chargeback_rate_pct": 0.3,
                "failed_payment_rate_pct": 3.0,
                "business_category": "grocery",
                "kyc_completeness_pct": 95.0,
                "credit_score": 750,
                "customer_complaint_rate_pct": 0.5
            }
        },
        {
            "name": "Urban Style Apparel (Medium Risk Fashion)",
            "data": {
                "business_age_months": 14,
                "monthly_transaction_volume": 850000.0,
                "avg_transaction_value": 1800.0,
                "transaction_growth_rate_pct": 5.0,
                "chargeback_rate_pct": 1.8,
                "failed_payment_rate_pct": 8.5,
                "business_category": "fashion",
                "kyc_completeness_pct": 85.0,
                "credit_score": 670,
                "customer_complaint_rate_pct": 2.1
            }
        },
        {
            "name": "CryptoPay Gateway (High Risk Crypto)",
            "data": {
                "business_age_months": 5,
                "monthly_transaction_volume": 4500000.0,
                "avg_transaction_value": 12500.0,
                "transaction_growth_rate_pct": 85.0,
                "chargeback_rate_pct": 4.5,
                "failed_payment_rate_pct": 18.2,
                "business_category": "crypto",
                "kyc_completeness_pct": 60.0,
                "credit_score": 580,
                "customer_complaint_rate_pct": 4.8
            }
        },
        {
            "name": "Jackpot Gaming Hub (High Risk Gambling)",
            "data": {
                "business_age_months": 3,
                "monthly_transaction_volume": 6000000.0,
                "avg_transaction_value": 3500.0,
                "transaction_growth_rate_pct": -15.0,
                "chargeback_rate_pct": 7.2,
                "failed_payment_rate_pct": 22.0,
                "business_category": "gambling",
                "kyc_completeness_pct": 40.0,
                "credit_score": 510,
                "customer_complaint_rate_pct": 6.5
            }
        }
    ]
    return samples

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
