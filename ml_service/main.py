from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import xgboost as xgb
import numpy as np
import pandas as pd
import re
from datetime import datetime

app = FastAPI(title="Interview Feedback ML Engine")

class TranscriptMessage(BaseModel):
    role: str
    content: str

class AnalysisRequest(BaseModel):
    transcript: List[TranscriptMessage]
    difficulty: str
    role: str

class AnalysisResponse(BaseModel):
    preparedness_score: int
    strengths: List[str]
    weaknesses: List[str]
    improvement_areas: List[str]
    technical_keyword_usage: float
    filler_word_ratio: float

# Placeholder for real model loading
# In a real scenario, you'd load a trained model:
# model = xgb.Booster()
# model.load_model("model.json")

def extract_features(transcript: List[TranscriptMessage], difficulty: str):
    # Join assistent messages for text analysis
    candidate_responses = [m.content for m in transcript if m.role == "assistant"] # Wait, usually assistant is the AI, user is candidate
    # Checking role: in Agent.tsx, we used 'user' for user and 'assistant' for AI.
    # Let's adjust based on common Vapi/OpenAI roles: user usually is candidate.
    
    candidate_text = " ".join([m.content for m in transcript if m.role == "user"])
    
    # Feature 1: Answer length (average)
    responses = [m.content for m in transcript if m.role == "user"]
    avg_length = np.mean([len(r.split()) for r in responses]) if responses else 0
    
    # Feature 2: Technical keywords (simplified)
    keywords = ["react", "node", "javascript", "cloud", "database", "api", "design", "security", "testing"]
    keyword_count = sum(1 for word in candidate_text.lower().split() if word in keywords)
    keyword_usage = keyword_count / len(candidate_text.split()) if candidate_text.split() else 0
    
    # Feature 3: Filler words (um, ah, like, strictly)
    filler_words = ["um", "ah", "uh", "like", "actually", "basically", "literally"]
    filler_count = sum(1 for word in candidate_text.lower().split() if word in filler_words)
    filler_ratio = filler_count / len(candidate_text.split()) if candidate_text.split() else 0
    
    return {
        "avg_length": avg_length,
        "keyword_usage": keyword_usage,
        "filler_ratio": filler_ratio,
        "num_responses": len(responses)
    }

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_interview(request: AnalysisRequest):
    features = extract_features(request.transcript, request.difficulty)
    
    # Mock inference logic using features
    # (In production, this would use model.predict)
    
    # Simple score heuristic for demonstration
    score = 70 
    score += (features["keyword_usage"] * 100)
    score -= (features["filler_ratio"] * 200)
    score += min(features["avg_length"] / 10, 20)
    
    score = min(max(int(score), 0), 100)
    
    # Generate static-ish feedback based on features
    strengths = []
    if features["keyword_usage"] > 0.05:
        strengths.append("Strong usage of technical terminology")
    if features["avg_length"] > 30:
        strengths.append("Provided detailed and comprehensive answers")
        
    weaknesses = []
    if features["filler_ratio"] > 0.02:
        weaknesses.append("Frequent use of filler words")
    if features["avg_length"] < 15:
        weaknesses.append("Responses were somewhat brief")
        
    improvement_areas = [
        "Structure responses using the STAR method",
        "Deepen understanding of core architectural patterns",
        "Minimize verbal fillers to sound more confident"
    ]
    
    return AnalysisResponse(
        preparedness_score=score,
        strengths=strengths or ["General competence shown"],
        weaknesses=weaknesses or ["No major red flags identified"],
        improvement_areas=improvement_areas,
        technical_keyword_usage=features["keyword_usage"],
        filler_word_ratio=features["filler_ratio"]
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
