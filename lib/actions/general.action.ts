"use server";

import { generateObject } from "ai";
import { google } from "@ai-sdk/google";

import { db } from "@/firebase/admin";
import { feedbackSchema } from "@/constants";

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
      createdAt: new Date().toISOString(),
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

  // Filter out current user's interviews in memory
  const filteredDocs = interviews.docs.filter(
    (doc) => doc.data().userId !== userId
  );

  // Sort in memory by createdAt (newest first)
  const sortedDocs = filteredDocs.sort((a, b) => {
    const aDate = new Date(a.data().createdAt || 0);
    const bDate = new Date(b.data().createdAt || 0);
    return bDate.getTime() - aDate.getTime();
  });

  // Apply limit after sorting
  const limitedDocs = sortedDocs.slice(0, limit);

  return limitedDocs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
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
    const aDate = new Date(a.data().createdAt || 0);
    const bDate = new Date(b.data().createdAt || 0);
    return bDate.getTime() - aDate.getTime();
  });

  return sortedDocs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}
