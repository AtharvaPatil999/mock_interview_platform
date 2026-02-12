import os
import uuid
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv
from agents import InterviewOrchestrator

load_dotenv()

app = FastAPI(title="Mock Interview AutoGen Service")

# In-memory session store
sessions: Dict[str, Dict[str, Any]] = {}

class StartSessionRequest(BaseModel):
    userName: str
    userId: str
    interviewId: str
    difficulty: str
    duration: int
    role: Optional[str] = "Technical"
    questions: List[str]

class RespondRequest(BaseModel):
    sessionId: str
    userInput: str

@app.post("/interview/start")
async def start_interview(req: StartSessionRequest):
    session_id = str(uuid.uuid4())
    
    sessions[session_id] = {
        "sessionId": session_id,
        "userName": req.userName,
        "userId": req.userId,
        "interviewId": req.interviewId,
        "difficulty": req.difficulty,
        "duration": req.duration,
        "role": req.role,
        "questions": req.questions,
        "currentQuestionIndex": 0,
        "followUpCount": 0,
        "transcript": [],
        "status": "active"
    }
    
    try:
        orchestrator = InterviewOrchestrator(sessions[session_id])
        
        # Generate questions if empty
        if not sessions[session_id]["questions"]:
            print(f"[BACKEND] Generating questions for {req.role}...")
            questions = await orchestrator.generate_questions()
            sessions[session_id]["questions"] = questions
            # Refresh orchestrator with new questions in session data
            orchestrator = InterviewOrchestrator(sessions[session_id])

        greeting = await orchestrator.get_next_response("Let's start the interview.")
    except Exception as e:
        print(f"Error starting interview: {e}")
        greeting = f"Hello {req.userName}, welcome to your technical interview. I'm Sam. Let's get started. To begin, could you tell me a bit about your experience with {req.role or 'technology'}?"

    sessions[session_id]["transcript"].append({"role": "assistant", "content": greeting})
    
    return {
        "sessionId": session_id,
        "message": greeting,
        "status": "active"
    }

@app.post("/interview/respond")
async def respond_to_interview(req: RespondRequest):
    if req.sessionId not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[req.sessionId]
    if session["status"] == "completed":
        return {"status": "completed", "final": True, "message": "Interview already finished."}

    session["transcript"].append({"role": "user", "content": req.userInput})
    
    try:
        orchestrator = InterviewOrchestrator(session)
        response = await orchestrator.get_next_response(req.userInput)
    except Exception as e:
        print(f"Error in interview respond: {e}")
        response = "That's an interesting point. Could you elaborate more on the technical trade-offs you considered in that scenario?"

    session["transcript"].append({"role": "assistant", "content": response})
    
    # Increment question index (simple logic for now)
    session["currentQuestionIndex"] += 1
    
    is_final = session["currentQuestionIndex"] >= len(session["questions"])
    
    if is_final:
        session["status"] = "completed"
        try:
            eval_prompt = "The interview is over. Evaluator, please provide a final structured summary of the candidate's performance including strengths, weaknesses, and a technical score (1-100)."
            summary = await orchestrator.get_next_response(eval_prompt)
        except:
            summary = "Technical evaluation completed. Feedback will be generated shortly."
            
        return {
            "message": response,
            "status": "completed",
            "final": True,
            "closingMessage": "Thank you for your time. I've gathered enough information to provide feedback. Feel free to check the results.",
            "summary": summary
        }
    
    return {
        "message": response,
        "status": "active",
        "final": False
    }

@app.post("/interview/end")
async def end_interview(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    session["status"] = "completed"
    
    # Here we would use EvaluatorAgent to generate final summary
    return {"message": "Interview completed successfully.", "summary": {}}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
