"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { feedbackSchema } from "@/constants";
import { z } from "zod";

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript, feedbackId } = params;

  try {
    if (!transcript || transcript.length < 3) {
      return { success: false, error: "Interview too short for analysis" };
    }
    const interview = await getInterviewById(interviewId);

    // 1. Get analysis from ML Service via API Route
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/feedback/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        difficulty: interview?.level || "Medium",
        role: interview?.role || "Software Engineer"
      }),
    });

    const analysis = await response.json();

    // 2. Supplement with Gemini assessment (optional but good for consistency)
    const formattedTranscript = transcript
      .map((sentence) => `- ${sentence.role}: ${sentence.content}\n`)
      .join("");

    const { object: geminiFeedback } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: feedbackSchema,
      prompt: `Analyze this interview transcript and provide category scores.
      Transcript: ${formattedTranscript}`,
    });

    const feedback = {
      interviewId,
      userId,
      totalScore: analysis.preparedness_score || geminiFeedback.totalScore,
      preparednessScore: analysis.preparedness_score,
      categoryScores: geminiFeedback.categoryScores,
      strengths: analysis.strengths && analysis.strengths.length > 0 ? analysis.strengths : geminiFeedback.strengths,
      areasForImprovement: [
        ...(analysis.weaknesses || []),
        ...(analysis.improvement_areas || []),
        ...(analysis.weaknesses?.length || analysis.improvement_areas?.length ? [] : geminiFeedback.areasForImprovement)
      ].slice(0, 5), // Keep it concise
      finalAssessment: geminiFeedback.finalAssessment,
      technicalKeywordUsage: analysis.technical_keyword_usage,
      fillerWordRatio: analysis.filler_word_ratio,
      createdAt: FieldValue.serverTimestamp(),
    };

    const feedbackRef = feedbackId
      ? db.collection("feedback").doc(feedbackId)
      : db.collection("feedback").doc();

    await feedbackRef.set(feedback);

    // 3. Mark interview as finalized
    await db.collection("interviews").doc(interviewId).update({
      finalized: true
    });

    return { success: true, feedbackId: feedbackRef.id };
  } catch (error) {
    console.error("Error saving feedback:", error);
    return { success: false };
  }
}

export async function createRoleInterview(params: {
  userId: string;
  role: string;
  duration: number;
  difficulty: string;
}) {
  try {
    const { userId, role, duration, difficulty } = params;

    let questions: string[] = [];

    try {
      const { object: questionsObject } = await generateObject({
        model: google("gemini-2.0-flash"),
        schema: z.object({
          questions: z.array(z.string()).length(5),
        }),
        prompt: `You are a technical interviewer for the role of ${role}.
        Generate exactly 5 specific interview questions for this role at a ${difficulty} difficulty level.
        
        Constraints:
        - Questions MUST be technical and specific to ${role}.
        - Match the difficulty level: ${difficulty}.
        - DO NOT ask generic questions like "Tell me about yourself" or "What are your strengths".
        - DO NOT ask unrelated questions like DSA if it's not core to the role (unless the role is specifically for DSA/Leetcoding).
        - Focus on core concepts, advanced topics, and practical scenarios for ${role}.`,
      });
      questions = questionsObject.questions;
    } catch (aiError: any) {
      console.error("Gemini API Error (likely quota):", aiError);
      // Fallback questions if AI fails
      questions = [
        `What are the core technical concepts every ${role} should master?`,
        `Can you describe a challenging project you worked on as a ${role} and how you overcame technical hurdles?`,
        `How do you stay updated with the latest trends and best practices in ${role} development?`,
        `Explain a complex technical problem you solved recently.`,
        `What are your favorite tools and frameworks for ${role} and why?`
      ];
    }

    const interviewData = {
      userId,
      role,
      level: difficulty,
      questions,
      techstack: [role.split(" ")[0]], // Basic techstack from role
      createdAt: FieldValue.serverTimestamp(),
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

  return interview.data() as Interview | null;
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
  return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
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

  return limitedDocs.map((doc) => {
    const data = doc.data();
    if (data.createdAt?.toDate) {
      data.createdAt = data.createdAt.toDate().toISOString();
    }
    return {
      id: doc.id,
      ...data,
    };
  }) as Interview[];
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

  return sortedDocs.map((doc) => {
    const data = doc.data();
    if (data.createdAt?.toDate) {
      data.createdAt = data.createdAt.toDate().toISOString();
    }
    return {
      id: doc.id,
      ...data,
    };
  }) as Interview[];
}
