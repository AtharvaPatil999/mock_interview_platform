interface Feedback {
  id: string;
  interviewId: string;
  userId: string;
  totalScore: number;
  status: "completed" | "processing" | "error";
  categoryScores: Array<{
    name: string;
    score: number;
    comment: string;
  }>;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  summary: string;
  finalAssessment: string;
  preparednessScore?: number;
  transcript: { role: string; content: string; timestamp: number }[];
  endedAt: string;
  durationSeconds: number;
  endReason: "manual" | "timer" | "ejection";
  createdAt: string;
}

interface Interview {
  id: string;
  role: string;
  level: string;
  questions: string[];
  techstack: string[];
  createdAt: string;
  userId: string;
  type: string;
  finalized: boolean;
  duration?: number;
  difficulty?: string;
  sourceType?: "resume" | "role";
}

interface CreateFeedbackParams {
  interviewId: string;
  userId: string;
  transcript: { role: string; content: string; timestamp: number }[];
  feedbackId?: string;
  endedAt: string;
  durationSeconds: number;
  endReason: "manual" | "timer" | "ejection";
}

interface User {
  name: string;
  email: string;
  id: string;
}

interface InterviewCardProps {
  interviewId: string;
  userId: string;
  role: string;
  type: string;
  techstack: string[];
  createdAt?: string;
  difficulty?: string;
  duration?: number;
  feedback?: Feedback | null;
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "generate" | "interview";
  questions?: string[];
  duration?: number;
  role?: string;
}

interface RouteParams {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string>>;
}

interface GetFeedbackByInterviewIdParams {
  interviewId: string;
  userId: string;
}

interface GetLatestInterviewsParams {
  userId: string;
  limit?: number;
}

interface SignInParams {
  email: string;
  idToken: string;
}

interface SignUpParams {
  uid: string;
  name: string;
  email: string;
  password: string;
}

type FormType = "sign-in" | "sign-up";

interface InterviewFormProps {
  interviewId: string;
  role: string;
  level: string;
  type: string;
  techstack: string[];
  amount: number;
}

interface TechIconProps {
  techStack: string[];
}

interface GenerateAIResponseParams {
  interviewId: string;
  transcript: { role: string; content: string; timestamp: number }[];
}

interface Challenge {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  examples: Array<{ input: string; output: string }>;
  constraints: string[];
  starterCode: Record<string, string>;
  testCases: Array<{ input: string; output: string }>;
  tags: string[];
  estimatedTime?: string;
  createdAt: string;
}

interface Submission {
  id: string;
  userId: string;
  challengeId: string;
  code: string;
  language: string;
  result: {
    passed: number;
    total: number;
    output: string;
    error: string | null;
  };
  submittedAt: string;
}
