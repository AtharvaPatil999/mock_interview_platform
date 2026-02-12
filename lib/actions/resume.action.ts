"use server";

import { revalidatePath } from "next/cache";
import { google } from "@ai-sdk/google";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { db } from "@/lib/firebase-admin";
import { serializeFirestore } from "../utils";

export async function processResumeAction(extractedText: string, userId: string) {
    try {
        console.log(`Starting resume processing for user: ${userId}`);

        const text = extractedText;

        // 1. Mark as processing in Firestore immediately
        try {
            await db.collection("resumes").doc(userId).set({
                userId,
                status: "processing",
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (dbError) {
            console.error("Failed to update status to 'processing' in Firestore:", dbError);
        }

        let summary = "Resume processing completed.";
        let extractedSkills: string[] = [];

        try {
            const { text: aiSummary } = await generateText({
                model: google("gemini-2.0-flash-001"),
                prompt: `Summarize the following resume text focusing on skills, experience, and projects. Keep it concise.
          
          Resume Text:
          ${text}`,
            });
            summary = aiSummary;
        } catch (error) {
            console.error("Summary generation failed:", error);
            summary = text.substring(0, 500) + "..."; // Fallback
        }

        try {
            const { object: skillsObject } = await generateObject({
                model: google("gemini-2.0-flash"),
                schema: z.object({
                    skills: z.array(z.string()),
                }),
                prompt: `Extract a list of technical and soft skills from the following resume text.
          
          Resume Text:
          ${text}`,
            });
            extractedSkills = skillsObject.skills;
        } catch (error) {
            console.error("Skill extraction failed:", error);
            extractedSkills = ["General Skills"]; // Basic fallback
        }

        // Store the final extracted info in Firestore
        try {
            await db.collection("resumes").doc(userId).set({
                userId,
                rawText: text, // As per prompt requirement
                summary: summary,
                extractedSkills,
                status: "processed",
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (dbError) {
            console.error("Failed to update status to 'processed' in Firestore:", dbError);
        }

        revalidatePath("/");

        return {
            success: true,
            extractedText: text,
            summary: summary,
            extractedSkills
        };
    } catch (error) {
        console.error("Error processing resume:", error);
        return { success: false, error: "Failed to process resume" };
    }
}

export async function createResumeInterview(params: {
    userId: string;
    role: string;
    summary: string;
    extractedText: string;
    duration: number;
    difficulty: string;
}) {
    try {
        const { userId, role, summary, extractedText, duration, difficulty } = params;

        let questions: string[] = [];

        try {
            const { object: questionsObject } = await generateObject({
                model: google("gemini-2.0-flash"),
                schema: z.object({
                    questions: z.array(z.string()).length(5),
                }),
                prompt: `You are a technical interviewer for a ${role} position.
          Based on the candidate's resume, generate exactly 5 DEEPLY TECHNICAL, non-generic interview questions.
          
          Resume Summary: ${summary}
          Extracted Text: ${extractedText}
          Difficulty: ${difficulty}
          
          STRICT CONSTRAINTS:
          - NO soft skills: Do not ask about collaboration, learning, or "discuss a time".
          - NO template phrases like "Walk me through a project...".
          - FOCUS: Technical architectural choices, implementation details, and engineering trade-offs made in their actual resume projects.
          - CONTENT: If they used [tech X], ask about the internal workings, performance implications, or scaling challenges of how they specifically applied it.
          - Ensure questions match the technical level: ${difficulty}.`,
            });
            questions = questionsObject.questions;
        } catch (aiError) {
            console.error("Resume question generation failed (Gemini 429 or other):", aiError);
            questions = []; // Rely on backend for dynamic question generation
        }

        const interviewData = {
            userId,
            role,
            level: difficulty,
            questions,
            techstack: [], // Could extract this too
            createdAt: new Date().toISOString(),
            type: "Resume-based",
            finalized: false,
            duration,
            difficulty,
            sourceType: "resume",
            resumeSummary: summary,
        };

        const docRef = await db.collection("interviews").add(interviewData);

        return { success: true, interviewId: docRef.id };
    } catch (error) {
        console.error("Error creating resume interview:", error);
        return { success: false };
    }
}

export async function getResumeByUserId(userId: string) {
    try {
        const doc = await db.collection("resumes").doc(userId).get();
        if (doc.exists) {
            return { success: true, data: serializeFirestore(doc.data()) };
        }
        return { success: false };
    } catch (error) {
        console.error("Error getting resume:", error);
        return { success: false };
    }
}
