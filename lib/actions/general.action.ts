"use server";

import { generateObject, generateText } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { feedbackSchema } from "@/constants";
import { z } from "zod";
import { serializeFirestore } from "../utils";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId, endedAt, durationSeconds, endReason } = params;

  if (!userId) throw new Error("User not authenticated");

  console.log(`[createFeedback] Starting feedback generation for interview ${interviewId} (${endReason})`);

  try {
    const interview = await getInterviewById(interviewId);
    const role = interview?.role || "Software Engineer";
    const difficulty = interview?.level || "Medium";

    // Validate transcript integrity
    if (!transcript || transcript.length < 2) {
      console.warn("[createFeedback] Empty or partial transcript received.");
      // If it's too short, we still generate a technical "minimal session" feedback
    }

    let mlAnalysis: any = null;
    let geminiFeedback: any = null;

    // 1. Try ML Service
    if (transcript && transcript.length >= 2) {
      try {
        console.log("[createFeedback] Calling ML service...");
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/feedback/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript, difficulty, role }),
        });

        if (response.ok) {
          mlAnalysis = await response.json();
          // Filter out "unavailable" strings from ML output if any
          if (mlAnalysis.improvement_areas) {
            mlAnalysis.improvement_areas = mlAnalysis.improvement_areas.filter((a: string) => !a.toLowerCase().includes("unavailable"));
          }
        }
      } catch (mlError: any) {
        console.warn("[createFeedback] ML service error:", mlError.message);
      }
    }

    // 2. Try Gemini (Primary or Fallback)
    if (transcript && transcript.length >= 2) {
      try {
        console.log("[createFeedback] Calling Gemini for analysis...");
        const formattedTranscript = transcript
          .map((sentence) => `- ${sentence.role}: ${sentence.content}\n`)
          .join("");

        const { object } = await generateObject({
          model: google("gemini-2.0-flash"),
          schema: feedbackSchema,
          prompt: `You are an expert technical interviewer. Analyze this transcript for a ${role} position.
          Transcript: ${formattedTranscript}
          
          RULES:
          - Provide realistic technical scores (0-100).
          - NEVER return "unavailable" or "N/A".
          - If the candidate performed poorly, reflect that in the score.
          - Identify specific technical strengths and growth areas.
          - Include at least 2 clear, actionable "next-step" recommendations.
          - Provide a short, concise summary (max 3 sentences) of the overall performance.`,
        });
        geminiFeedback = object;
      } catch (geminiError: any) {
        console.warn("[createFeedback] Gemini error:", geminiError.message);
      }
    }

    // 3. Final Aggregation with Rule-Based Fallback
    const hasData = transcript && transcript.length >= 2;

    // Default fallback if everything else fails but we have a transcript
    const ruleBasedFallback = {
      totalScore: 45, // Neutral starting point for error states with data
      categoryScores: [
        { name: "Communication", score: 50, comment: "Communication was observed but technical analysis failed." },
        { name: "Technical Knowledge", score: 40, comment: "Technical analysis could not be completed at this time." },
        { name: "Problem Solving", score: 40, comment: "Problem-solving assessment unavailable due to processing error." },
        { name: "Confidence", score: 50, comment: "Confidence level appeared moderate in this session." }
      ],
      strengths: ["Participated in the technical interview session"],
      areasForImprovement: ["Unable to generate detailed technical feedback due to a system error. Please review your transcript manually."],
      recommendations: ["Complete more technical practice sessions", "Focus on clarity in technical explanations"],
      summary: "The interview analysis could not be fully completed due to a system error, but the session was recorded.",
      finalAssessment: "Your session was recorded correctly, but our AI analysis engine encountered an error. Your transcript is available for review below."
    };

    const finalFeedback = geminiFeedback || ruleBasedFallback;
    const finalScore = mlAnalysis?.preparedness_score || finalFeedback.totalScore;

    const feedback = {
      interviewId,
      userId,
      status: "completed",
      totalScore: finalScore,
      preparednessScore: finalScore,
      transcript,
      endedAt: endedAt || new Date().toISOString(),
      durationSeconds: durationSeconds || 0,
      endReason,
      categoryScores: finalFeedback.categoryScores,
      strengths: mlAnalysis?.strengths?.length > 0 ? mlAnalysis.strengths : finalFeedback.strengths,
      areasForImprovement: (mlAnalysis?.improvement_areas?.length > 0
        ? mlAnalysis.improvement_areas
        : finalFeedback.areasForImprovement).slice(0, 5),
      recommendations: finalFeedback.recommendations || ["Continue practicing technical fundamentals"],
      summary: finalFeedback.summary || "A technical session covering core concepts for the specified role.",
      finalAssessment: finalFeedback.finalAssessment,
      technicalKeywordUsage: mlAnalysis?.technical_keyword_usage || 0,
      fillerWordRatio: mlAnalysis?.filler_word_ratio || 0,
      dataQuality: hasData ? (mlAnalysis && geminiFeedback ? "complete" : "partial") : "insufficient",
      createdAt: new Date().toISOString(),
    };

    console.log("[createFeedback] Saving feedback to Firestore...");
    const feedbackRef = feedbackId
      ? db.collection("feedback").doc(feedbackId)
      : db.collection("feedback").doc();

    await feedbackRef.set(feedback);

    await db.collection("interviews").doc(interviewId).update({
      finalized: true,
    });

    console.log(`[createFeedback] ✅ Feedback saved successfully: ${feedbackRef.id}`);
    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("[createFeedback] ❌ Critical failure:", error);
    throw error; // Let the caller handle the final failure
  }
}

export async function generateAIResponse(params: GenerateAIResponseParams) {
  const { interviewId, transcript } = params;

  try {
    const interview = await getInterviewById(interviewId);
    if (!interview) throw new Error("Interview not found");

    const role = interview.role;
    const questions = interview.questions.map((q) => `- ${q}`).join("\n");

    const formattedTranscript = transcript
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n");

    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      system: `You are a friendly, calm, and encouraging senior technical interviewer named Sam. Your goal is to conduct a professional yet comfortable technical discussion to evaluate the candidate's depth and problem-solving skills.
        
        CRITICAL INSTRUCTIONS:
        1. TONE: Be professional, encouraging, and supportive. Use phrases like "That's a great point," "Could you tell me more about...", or "I'm curious how you handled...".
        2. NO HR QUESTIONS: Never ask "Tell me about yourself", "What are your challenges", or "What frameworks do you like".
        3. PROGRESSIVE DIFFICULTY: Each subsequent question should naturally flow from the previous answer and dive deeper into technical mechanics.
        4. FOLLOW-UPS: If a candidate's answer is vague, short, or missing key technical details, ask a polite follow-up or cross-question to probe further. Reference their specific point if possible.
        5. STAY IN CHARACTER: You are a human interviewer. Avoid sounding robotic.
        
        MANDATORY RULES:
        - You MUST continue the technical discussion for the duration of the interview.
        - NEVER end the session or say closing phrases like "Thank you for your time" or "That's all".
        
        Guidelines:
        - Primary Focus: ${role} interview.
        - Core topics to cover: 
        ${questions}
        - Flow: Ask EXACTLY ONE technical question at a time.
        - Keep responses concise (under 40 words) but conversational.
        - Sound natural, friendly, and human.`,
      prompt: `Conversation history so far:
      ${formattedTranscript}
      
      Sam, please provide the next encouraging technical question or a specific follow-up based on the candidate's last response.`,
    });

    console.log("[AI] response received");
    return { success: true, text };
  } catch (error) {
    console.error("[generateAIResponse] error:", error);
    // Robust fallback for Gemini (429 or other errors)
    return {
      success: true,
      text: "That's an interesting point you've raised there. I'd love to dive a bit deeper into the technical implementation—could you walk me through how you'd handle the trade-offs in that specific scenario?"
    };
  }
}

export async function createRoleInterview(params: {
  userId: string;
  role: string;
  duration: number;
  difficulty: string;
}) {
  const { userId, role, duration, difficulty } = params;
  if (!userId) throw new Error("User not authenticated");

  try {

    let questions: string[] = [];

    try {
      const { object: questionsObject } = await generateObject({
        model: google("gemini-2.0-flash"),
        schema: z.object({
          questions: z.array(z.string()).length(5),
        }),
        prompt: `You are a senior technical interviewer for a ${role} position.
        Generate exactly 5 deeply technical, non-generic interview questions for a candidate at the ${difficulty} level.
        
        STRICT CONSTRAINTS:
        - NO HR questions: Do not ask about strengths, weaknesses, or "tell me about yourself".
        - NO generic template phrases like "What are the core concepts...".
        - NO experience fluff: Do not ask "What was your most challenging project".
        - TAILOR strictly to the role of ${role} and common tech stacks associated with it.
        
        REQUIRED CONTENT:
        - Focus on technical trade-offs, internal architectural mechanics, and practical scenario-based problem solving.
        - Include at least one question about handling high-scale performance, distributed systems, or complex edge cases relevant to ${role}.
        - Each question must be a direct technical probe into implementation details.`,
      });
      questions = questionsObject.questions;
    } catch (aiError: any) {
      console.error("Gemini API Error (likely quota):", aiError);

      // Role-specific meaningful fallbacks
      const fallbackSets: Record<string, string[]> = {
        "Java Developer": [
          "Explain the memory model in JVM and how Garbage Collection works under high pressure.",
          "How do you handle race conditions when working with distributed caching in a Java environment?",
          "Walk me through your strategy for profiling and fixing a memory leak in a Spring Boot application.",
          "Compare Synchronous vs Asynchronous processing in Java – when would you choose WebFlux over Standard MVC?",
          "How would you implement a robust circuit breaker pattern in a microservices architecture using Java?"
        ],
        "Python Developer": [
          "How does Python's GIL impact multi-threaded performance, and what are the alternatives for CPU-bound tasks?",
          "Explain the internal mechanics of Python decorators and how they handle scope and closures.",
          "How would you optimize a Django or FastAPI endpoint that is experiencing high database latency?",
          "Walk me through the differences between list comprehensions and generators in terms of memory efficiency.",
          "How do you handle dependency management and environment isolation in a large-scale Python project?"
        ]
      };

      questions = fallbackSets[role] || [
        `What are the technical trade-offs you consider when architecting a system for ${role}?`,
        `How do you handle state management and consistency in a distributed ${role} application?`,
        `Describe a scenario where you had to optimize ${role} code for extreme performance – what tools did you use?`,
        `How do you implement robust security measures and prevent common vulnerabilities in your ${role} stack?`,
        `Explain how you would handle complex data migrations in a live production environment for a ${role} position.`
      ];
    }

    const interviewData = {
      userId,
      role,
      level: difficulty,
      questions,
      techstack: [role.split(" ")[0]], // Basic techstack from role
      createdAt: new Date().toISOString(),
      type: "Role-based",
      finalized: false,
      duration,
      difficulty,
      sourceType: "role",
    };

    const docRef = await db.collection("interviews").add(interviewData);

    return { success: true, interviewId: docRef.id, isFallback: questions.length > 0 && !questions[0].toLowerCase().includes(role.toLowerCase()) };
  } catch (error) {
    console.error("Error creating role interview:", error);
    return { success: false, error: "Failed to create interview session" };
  }
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();
  if (!interview.exists) return null;

  const data = interview.data();
  return serializeFirestore({ id: interview.id, ...data }) as Interview;
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const querySnapshot = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (querySnapshot.empty) return null;

  const feedbackDoc = querySnapshot.docs[0];
  const data = feedbackDoc.data();
  return serializeFirestore({ id: feedbackDoc.id, ...data }) as Feedback;
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  // Only filter by finalized to avoid composite index requirement
  const interviews = await db
    .collection("interviews")
    .where("finalized", "==", true)
    .get();

  // Filter for current user's interviews
  const filteredDocs = interviews.docs.filter(
    (doc) => doc.data().userId === userId
  );

  // Sort in memory by createdAt (newest first)
  const sortedDocs = filteredDocs.sort((a, b) => {
    const aData = a.data();
    const bData = b.data();
    const aDate = aData.createdAt?.toDate ? aData.createdAt.toDate() : new Date(aData.createdAt || 0);
    const bDate = bData.createdAt?.toDate ? bData.createdAt.toDate() : new Date(bData.createdAt || 0);
    return bDate.getTime() - aDate.getTime();
  });

  // Apply limit after sorting
  const limitedDocs = sortedDocs.slice(0, limit);

  return serializeFirestore(limitedDocs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data(),
    };
  })) as Interview[];
}

export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .get();

  // Sort in memory to avoid composite index requirement
  const sortedDocs = interviews.docs.sort((a, b) => {
    const aData = a.data();
    const bData = b.data();
    const aDate = aData.createdAt?.toDate ? aData.createdAt.toDate() : new Date(aData.createdAt || 0);
    const bDate = bData.createdAt?.toDate ? bData.createdAt.toDate() : new Date(bData.createdAt || 0);
    return bDate.getTime() - aDate.getTime();
  });

  return serializeFirestore(sortedDocs.map((doc) => {
    return {
      id: doc.id,
      ...doc.data(),
    };
  })) as Interview[];
}
