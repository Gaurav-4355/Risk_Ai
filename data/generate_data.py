import os
import numpy as np
import pandas as pd

def generate_merchant_dataset(n_samples: int = 3500, seed: int = 42) -> pd.DataFrame:
    """
    Generates a realistic synthetic dataset of merchants for risk assessment.
    Features reflect Indian fintech metrics (volume in INR, CIBIL credit scores).
    Target 'risk_label': 0 = Low Risk, 1 = Medium Risk, 2 = High Risk.
    """
    np.random.seed(seed)
    
    # 1. Feature Generation
    business_age_months = np.random.randint(1, 241, size=n_samples) # 1 month to 20 years
    
    # Monthly transaction volume in INR (log-normal distribution)
    log_vol = np.random.normal(loc=13.5, scale=1.2, size=n_samples) # ~50K to 50M INR
    monthly_transaction_volume = np.clip(np.exp(log_vol), 50000, 100000000).round(2)
    
    # Average transaction value in INR
    avg_tx = monthly_transaction_volume * np.random.uniform(0.0005, 0.05, size=n_samples)
    avg_transaction_value = np.clip(avg_tx, 50, 100000).round(2)
    
    # Transaction growth rate pct (-50% to +200%)
    transaction_growth_rate_pct = np.random.normal(loc=15, scale=25, size=n_samples).round(2)
    transaction_growth_rate_pct = np.clip(transaction_growth_rate_pct, -50, 200)
    
    # Chargeback rate pct (0% to 15%, exponentially distributed, mostly low)
    chargeback_rate_pct = np.random.exponential(scale=1.2, size=n_samples).round(2)
    chargeback_rate_pct = np.clip(chargeback_rate_pct, 0.0, 15.0)
    
    # Failed payment rate pct (0% to 30%)
    failed_payment_rate_pct = np.random.normal(loc=4.5, scale=4.0, size=n_samples).round(2)
    failed_payment_rate_pct = np.clip(failed_payment_rate_pct, 0.0, 30.0)
    
    # Business categories with associated intrinsic risk multiplier
    categories = ['grocery', 'education', 'electronics', 'gambling', 'crypto', 
                  'fashion', 'food_delivery', 'healthcare', 'travel', 'saas']
    category_weights = [0.20, 0.10, 0.15, 0.03, 0.02, 0.15, 0.15, 0.08, 0.07, 0.05]
    business_category = np.random.choice(categories, size=n_samples, p=category_weights)
    
    # KYC completeness pct (bimodal: mostly 100% or 80-100%, some low)
    kyc_raw = np.random.choice([100, 90, 75, 50, 20], size=n_samples, p=[0.70, 0.15, 0.08, 0.05, 0.02])
    kyc_completeness_pct = np.clip(kyc_raw + np.random.uniform(-5, 5, size=n_samples), 0, 100).round(2)
    
    # Credit score (CIBIL equivalent: 300 to 900)
    credit_score = np.random.normal(loc=730, scale=80, size=n_samples).astype(int)
    credit_score = np.clip(credit_score, 300, 900)
    
    # Customer complaint rate pct (0% to 10%)
    customer_complaint_rate_pct = np.random.exponential(scale=0.8, size=n_samples).round(2)
    customer_complaint_rate_pct = np.clip(customer_complaint_rate_pct, 0.0, 10.0)
    
    # 2. Synthetic Ground Truth Risk Score Calculation (Rule-based with domain weights)
    category_risk_map = {
        'crypto': 35.0,
        'gambling': 40.0,
        'travel': 15.0,
        'electronics': 10.0,
        'food_delivery': 8.0,
        'fashion': 5.0,
        'grocery': 2.0,
        'education': 1.0,
        'saas': 2.0,
        'healthcare': 1.0
    }
    cat_risk = np.array([category_risk_map[c] for c in business_category])
    
    latent_risk = (
        chargeback_rate_pct * 4.5 +                 # Chargebacks heavily increase risk
        failed_payment_rate_pct * 1.5 +               # Failed payments increase risk
        customer_complaint_rate_pct * 3.5 +           # Complaints increase risk
        cat_risk +                                    # High risk business category
        (900 - credit_score) * 0.08 +                 # Low credit score increases risk
        (100 - kyc_completeness_pct) * 0.25 +         # Incomplete KYC increases risk
        np.maximum(0, 12 - business_age_months) * 1.2 -# Young business (<1 year) increases risk
        (transaction_growth_rate_pct * 0.1)           # Negative growth increases risk
    )
    
    # Add realistic random noise so data is not perfectly separable
    noise = np.random.normal(loc=0, scale=8.0, size=n_samples)
    final_score = latent_risk + noise
    
    # Normalize score approximately 0-100 range and assign risk_label
    # 0 = Low Risk, 1 = Medium Risk, 2 = High Risk
    risk_label = np.zeros(n_samples, dtype=int)
    risk_label[final_score >= 38] = 1
    risk_label[final_score >= 62] = 2
    
    df = pd.DataFrame({
        'business_age_months': business_age_months,
        'monthly_transaction_volume': monthly_transaction_volume,
        'avg_transaction_value': avg_transaction_value,
        'transaction_growth_rate_pct': transaction_growth_rate_pct,
        'chargeback_rate_pct': chargeback_rate_pct,
        'failed_payment_rate_pct': failed_payment_rate_pct,
        'business_category': business_category,
        'kyc_completeness_pct': kyc_completeness_pct,
        'credit_score': credit_score,
        'customer_complaint_rate_pct': customer_complaint_rate_pct,
        'risk_label': risk_label
    })
    
    return df

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    df = generate_merchant_dataset(n_samples=3500, seed=42)
    output_path = os.path.join("data", "merchant_data.csv")
    df.to_csv(output_path, index=False)
    print(f"Dataset successfully created at {output_path}")
    print(f"Shape: {df.shape}")
    print("Risk Label Counts:")
    print(df['risk_label'].value_counts())
