import os
import json
import joblib
import numpy as np
import pandas as pd
import shap
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

def train_risk_model(data_path: str, model_dir: str = "model"):
    """
    Trains a RandomForest model to classify merchant risk (0=Low, 1=Medium, 2=High).
    Calculates cross-validation and test set metrics, fits SHAP TreeExplainer,
    and serializes model artifacts.
    """
    os.makedirs(model_dir, exist_ok=True)
    
    # 1. Load Dataset
    df = pd.read_csv(data_path)
    X = df.drop(columns=['risk_label'])
    y = df['risk_label']
    
    categorical_cols = ['business_category']
    numeric_cols = [c for c in X.columns if c not in categorical_cols]
    
    # 2. Preprocessing & Feature Engineering Setup
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', 'passthrough', numeric_cols),
            ('cat', OneHotEncoder(sparse_output=False, handle_unknown='ignore'), categorical_cols)
        ]
    )
    
    # 3. Train / Test Split (80% Train, 20% Test)
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    
    # Fit preprocessor on X_train_raw
    X_train = preprocessor.fit_transform(X_train_raw)
    X_test = preprocessor.transform(X_test_raw)
    
    # Retrieve transformed feature names
    cat_encoder = preprocessor.named_transformers_['cat']
    encoded_cat_names = list(cat_encoder.get_feature_names_out(categorical_cols))
    feature_names = numeric_cols + encoded_cat_names
    
    # 4. Cross-Validation on Training Set (5-Fold Stratified CV)
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=4,
        random_state=42,
        class_weight='balanced'
    )
    
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    scoring = ['accuracy', 'precision_weighted', 'recall_weighted', 'f1_weighted']
    cv_results = cross_validate(rf_model, X_train, y_train, cv=cv, scoring=scoring)
    
    cv_metrics = {
        "accuracy_mean": round(float(np.mean(cv_results['test_accuracy'])), 4),
        "accuracy_std": round(float(np.std(cv_results['test_accuracy'])), 4),
        "precision_mean": round(float(np.mean(cv_results['test_precision_weighted'])), 4),
        "recall_mean": round(float(np.mean(cv_results['test_recall_weighted'])), 4),
        "f1_mean": round(float(np.mean(cv_results['test_f1_weighted'])), 4)
    }
    
    # 5. Fit Model on Full Training Set and Evaluate on Held-out Test Set
    rf_model.fit(X_train, y_train)
    y_pred = rf_model.predict(X_test)
    y_proba = rf_model.predict_proba(X_test)
    
    cm = confusion_matrix(y_test, y_pred).tolist()
    
    test_metrics = {
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision_weighted": round(float(precision_score(y_test, y_pred, average='weighted')), 4),
        "recall_weighted": round(float(recall_score(y_test, y_pred, average='weighted')), 4),
        "f1_weighted": round(float(f1_score(y_test, y_pred, average='weighted')), 4),
        "confusion_matrix": cm,
        "classification_report": classification_report(y_test, y_pred, output_dict=True)
    }
    
    metrics = {
        "cv_metrics": cv_metrics,
        "test_metrics": test_metrics
    }
    
    metrics_file = os.path.join(model_dir, "metrics.json")
    with open(metrics_file, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"Metrics saved to {metrics_file}")
    
    # 6. Fit SHAP TreeExplainer
    explainer = shap.TreeExplainer(rf_model)
    
    # 7. Save Model Artifacts
    artifacts = {
        "model": rf_model,
        "preprocessor": preprocessor,
        "feature_names": feature_names,
        "numeric_cols": numeric_cols,
        "categorical_cols": categorical_cols,
        "explainer": explainer
    }
    
    model_path = os.path.join(model_dir, "model_artifacts.pkl")
    joblib.dump(artifacts, model_path)
    print(f"Model artifacts serialized to {model_path}")
    
    print("\n--- Test Set Performance ---")
    print(f"Accuracy: {test_metrics['accuracy'] * 100:.2f}%")
    print(f"F1 Score (Weighted): {test_metrics['f1_weighted']:.4f}")
    print("Confusion Matrix:")
    print(np.array(cm))

if __name__ == "__main__":
    train_risk_model(data_path="data/merchant_data.csv")
