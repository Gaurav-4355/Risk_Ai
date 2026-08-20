import pytest
from fastapi.testclient import TestClient
from backend.main import app, compute_decision_and_loan

client = TestClient(app)

# ---------------------------------------------------------
# 1. Boundary Unit Tests for Risk Score Thresholds
# ---------------------------------------------------------
def test_risk_score_boundary_33_low():
    res = compute_decision_and_loan(risk_score=33.0, monthly_volume=100000.0, kyc_pct=100.0)
    assert res["risk_tier"] == "Low"
    assert res["onboarding_decision"] == "Approve"
    assert "10.5%" in res["loan_recommendation"]["interest_tier"]
    assert res["loan_recommendation"]["eligible"] is True
    assert res["loan_recommendation"]["max_loan_amount"] == pytest.approx(201000.0, rel=1e-2)

def test_risk_score_boundary_34_medium():
    res = compute_decision_and_loan(risk_score=34.0, monthly_volume=100000.0, kyc_pct=100.0)
    assert res["risk_tier"] == "Medium"
    assert res["onboarding_decision"] == "Manual Review"
    assert "15.0%" in res["loan_recommendation"]["interest_tier"]
    assert res["loan_recommendation"]["eligible"] is True
    assert res["loan_recommendation"]["max_loan_amount"] == pytest.approx(198000.0, rel=1e-2)

def test_risk_score_boundary_66_medium():
    res = compute_decision_and_loan(risk_score=66.0, monthly_volume=100000.0, kyc_pct=100.0)
    assert res["risk_tier"] == "Medium"
    assert res["onboarding_decision"] == "Manual Review"
    assert "15.0%" in res["loan_recommendation"]["interest_tier"]
    assert res["loan_recommendation"]["eligible"] is True
    assert res["loan_recommendation"]["max_loan_amount"] == pytest.approx(102000.0, rel=1e-2)

def test_risk_score_boundary_67_high():
    res = compute_decision_and_loan(risk_score=67.0, monthly_volume=100000.0, kyc_pct=100.0)
    assert res["risk_tier"] == "High"
    assert res["onboarding_decision"] == "Reject"
    assert "21.0%" in res["loan_recommendation"]["interest_tier"]
    assert res["loan_recommendation"]["eligible"] is False
    assert res["loan_recommendation"]["max_loan_amount"] == 0.0

# ---------------------------------------------------------
# 2. Input Validation Tests (Pydantic 422 Errors)
# ---------------------------------------------------------
def test_input_validation_credit_score_below_bound():
    payload = {
        "business_age_months": 12,
        "monthly_transaction_volume": 100000.0,
        "avg_transaction_value": 500.0,
        "transaction_growth_rate_pct": 10.0,
        "chargeback_rate_pct": 0.5,
        "failed_payment_rate_pct": 2.0,
        "business_category": "saas",
        "kyc_completeness_pct": 100.0,
        "credit_score": 200, # Invalid: below 300
        "customer_complaint_rate_pct": 0.5
    }
    response = client.post("/score-merchant", json=payload)
    assert response.status_code == 422
    errors = response.json()["detail"]
    assert any(err["loc"] == ["body", "credit_score"] for err in errors)

def test_input_validation_chargeback_above_bound():
    payload = {
        "business_age_months": 12,
        "monthly_transaction_volume": 100000.0,
        "avg_transaction_value": 500.0,
        "transaction_growth_rate_pct": 10.0,
        "chargeback_rate_pct": 150.0, # Invalid: > 100%
        "failed_payment_rate_pct": 2.0,
        "business_category": "saas",
        "kyc_completeness_pct": 100.0,
        "credit_score": 750,
        "customer_complaint_rate_pct": 0.5
    }
    response = client.post("/score-merchant", json=payload)
    assert response.status_code == 422

# ---------------------------------------------------------
# 3. End-to-End API Integration Tests
# ---------------------------------------------------------
def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_sample_merchants_endpoint():
    response = client.get("/sample-merchants")
    assert response.status_code == 200
    samples = response.json()
    assert len(samples) >= 3
    assert "data" in samples[0]

def test_score_merchant_endpoint_success():
    valid_payload = {
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
    response = client.post("/score-merchant", json=valid_payload)
    assert response.status_code == 200
    data = response.json()
    
    assert "risk_score" in data
    assert 0.0 <= data["risk_score"] <= 100.0
    assert data["risk_tier"] in ["Low", "Medium", "High"]
    assert data["onboarding_decision"] in ["Approve", "Manual Review", "Reject"]
    assert len(data["top_risk_factors"]) == 5
    assert data["top_risk_factors"][0]["direction"] in ["increases_risk", "decreases_risk"]
    assert "max_loan_amount" in data["loan_recommendation"]
