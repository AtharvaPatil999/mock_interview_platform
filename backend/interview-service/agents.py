import os
from typing import List, Dict, Any
from autogen import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
from dotenv import load_dotenv

load_dotenv()

# Configuration for Gemini using AutoGen's model client structure
llm_config = {
    "config_list": [
        {
            "model": "gemini-1.5-flash",
            "api_key": os.getenv("GOOGLE_GENERATIVE_AI_API_KEY"),
            "api_type": "google"
        }
    ],
    "cache_seed": 42,
}

class InterviewOrchestrator:
    def __init__(self, session_data: Dict[str, Any]):
        self.session_data = session_data
        self.interviewer = self._create_interviewer()
        self.evaluator = self._create_evaluator()
        self.manager = self._create_manager()
        
    def _create_interviewer(self):
        questions_list = "\n".join([f"- {q}" for q in self.session_data.get('questions', [])])
        system_msg = f"""You are a senior technical interviewer named Sam.
Your goal is to conduct a {self.session_data['difficulty']} level interview for a {self.session_data.get('role', 'Technical')} position.

Core technical topics to cover:
{questions_list}

Current Session:
- Candidate Name: {self.session_data.get('userName', 'Candidate')}
- Difficulty: {self.session_data['difficulty']}
- Progress: Question {self.session_data['currentQuestionIndex'] + 1} of {max(1, len(self.session_data.get('questions', [])))}

Instructions:
1. Be warm, professional, and encouraging.
2. If it's the start, greet the candidate and ask the first question.
3. If the candidate has provided an answer, acknowledge it briefly and decide (with Evaluator feedback) whether to ask a follow-up or move to the next question.
4. Keep responses focused and technical. Reference the topics/questions listed above.
5. Do NOT say "That's all" or "Thank you for your time" until the session is explicitly marked as over.
"""
        return AssistantAgent(
            name="Interviewer",
            system_message=system_msg,
            llm_config=llm_config,
        )
        
    def _create_evaluator(self):
        system_msg = """You are a technical evaluation agent.
Your role is to analyze the candidate's response for:
1. Technical correctness.
2. Clarity and communication.
3. Depth of knowledge.

Based on the answer:
- If the answer is vague or suggests a lack of depth, recommend a follow-up question.
- If the answer is sufficient, recommend moving to the next question.
- Provide a brief internal score (1-10) for the response.

Always communicate your recommendation to the Interviewer.
"""
        return AssistantAgent(
            name="Evaluator",
            system_message=system_msg,
            llm_config=llm_config,
        )
        
    def _create_manager(self):
        # The SessionManager logic is partly in main.py, but we can use a UserProxyAgent
        # to represent the candidate/system interface.
        return UserProxyAgent(
            name="SessionManager",
            human_input_mode="NEVER",
            code_execution_config=False,
        )

    async def generate_questions(self) -> List[str]:
        # Generate initial questions if not provided
        prompt = f"As a senior interviewer, generate 5 technical questions for a {self.session_data.get('role')} position at {self.session_data.get('difficulty')} difficulty. Return ONLY the questions as a python-style list of strings (e.g., ['Q1', 'Q2', ...])."
        try:
            response = self.interviewer.generate_reply(messages=[{"content": prompt, "role": "user"}])
            if isinstance(response, dict): response = response.get("content", "")
            # Simple extraction for now
            if "[" in response and "]" in response:
                return eval(response[response.find("["):response.find("]")+1])
            return [line.strip("- ") for line in response.split("\n") if line.strip()]
        except Exception as e:
            print(f"[BACKEND] Gemini fallback triggered for questions: {e}")
            return ["Can you walk me through your technical background?", "How do you handle complex problem solving?", "Explain a challenging technical project you worked on.", "What are your preferred tools and why?", "How do you stay updated with technology?"]

    async def get_next_response(self, user_input: str) -> str:
        # Orchestrate turn between user, evaluator, and interviewer
        context_msgs = [{"content": user_input, "role": "user"}]
        
        try:
            # Internal Evaluation
            eval_result = self.evaluator.generate_reply(messages=context_msgs)
            if isinstance(eval_result, dict): eval_result = eval_result.get("content", "")
            
            # Final response from Sam
            interviewer_prompt = f"Internal Evaluation: {eval_result}\n\nCandidate said: {user_input}"
            response = self.interviewer.generate_reply(messages=[{"content": interviewer_prompt, "role": "user"}])
            if isinstance(response, dict): response = response.get("content", "")
            return response
        except Exception as e:
            print(f"[BACKEND] Gemini fallback triggered for response: {e}")
            return "That's an interesting point. Could you elaborate more on the technical trade-offs you considered in that scenario?"
