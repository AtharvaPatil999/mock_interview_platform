import pandas as pd
import numpy as np
import xgboost as xgb
import os
import json

# Set seed for reproducibility
np.random.seed(42)

def generate_synthetic_data(num_samples=1000):
    data = []
    roles = ["Java Developer", "Python Developer", "Data Scientist", "Frontend Engineer", "Backend Developer"]
    
    for _ in range(num_samples):
        # Feature 1: Filler word ratio (0.0 to 0.1) - Lower is better
        filler_ratio = np.random.uniform(0.0, 0.1)
        
        # Feature 2: Long pause count (0 to 10) - Lower is better
        long_pause_count = np.random.randint(0, 11)
        
        # Feature 3: Average sentence length (5 to 50 words) - Sweet spot around 25-35
        avg_sentence_length = np.random.uniform(5, 50)
        
        # Feature 4: Answer length variance (0 to 100) - Some variance is good, too much is rambling
        ans_length_variance = np.random.uniform(0, 100)
        
        # Feature 5: Technical keyword density (0.0 to 0.2) - Higher is better
        keyword_density = np.random.uniform(0, 0.2)
        
        # Target: Preparedness Score (0-100)
        # Heuristic for generating the target score
        score = 50 
        score -= filler_ratio * 200      # Max deduction ~20
        score -= long_pause_count * 2    # Max deduction 20
        score += keyword_density * 200  # Max addition 40
        
        # Sweet spot for sentence length
        if 20 <= avg_sentence_length <= 40:
            score += 10
        else:
            score -= 5
            
        # Variance penalty
        if ans_length_variance > 70:
            score -= 5
            
        score = min(max(int(score + np.random.normal(0, 5)), 0), 100)
        
        data.append({
            "filler_ratio": filler_ratio,
            "long_pause_count": long_pause_count,
            "avg_sentence_length": avg_sentence_length,
            "ans_length_variance": ans_length_variance,
            "keyword_density": keyword_density,
            "score": score
        })
        
    return pd.DataFrame(data)

def train_and_save():
    print("Generating synthetic dataset...")
    df = generate_synthetic_data()
    
    # Base directory for the script
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # Save dataset
    data_path = os.path.join(BASE_DIR, "data", "interview_data.csv")
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    df.to_csv(data_path, index=False)
    print(f"Data saved to {data_path}")
    
    # Prepare features and target
    X = df.drop("score", axis=1)
    y = df["score"]
    
    # Train XGBoost model
    print("Training XGBoost model...")
    model = xgb.XGBRegressor(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        random_state=42
    )
    model.fit(X, y)
    
    # Save model
    model_path = os.path.join(BASE_DIR, "model", "xgboost_model.json")
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    model.save_model(model_path)
    print(f"Model saved to {model_path}")
    
    # Save metadata (feature names)
    with open(os.path.join(BASE_DIR, "model", "metadata.json"), "w") as f:
        json.dump({
            "features": list(X.columns),
            "created_at": pd.Timestamp.now().isoformat()
        }, f)

if __name__ == "__main__":
    train_and_save()
