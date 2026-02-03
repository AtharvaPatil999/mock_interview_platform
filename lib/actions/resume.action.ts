"use server";

import * as pdf from "pdf-parse";
import { google } from "@ai-sdk/google";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { db } from "@/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function processResumeAction(binaryData: Uint8Array | Buffer, userId: string) {
    try {
        const fileBuffer = Buffer.from(binaryData);
        const pdfParser = (pdf as any).default || pdf;
        const data = await pdfParser(fileBuffer);
        const text = data.text;

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
            summary = text.substring(0, 500) + "..."; // Fallback to first 500 chars
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

        // Store the extracted text and summary in Firestore using userId as document ID
        await db.collection("resumes").doc(userId).set({
            userId,
            extractedText: text,
            summary: summary,
            extractedSkills,
            status: "processed",
            updatedAt: FieldValue.serverTimestamp()
        });

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
                prompt: `You are a technical interviewer for the role of ${role}.
          Based ONLY on the candidate's resume (summary and text provided below), generate exactly 5 specific interview questions.
          
          Resume Summary: ${summary}
          Extracted Text: ${extractedText}
          
          Difficulty: ${difficulty}
          
          Constraints:
          - Questions MUST be derived from the candidate's actual projects, skills, or experience mentioned in the resume.
          - DO NOT ask questions about technologies or roles NOT present in the resume.
          - Ensure the questions match the requested difficulty: ${difficulty}.`,
            });
            questions = questionsObject.questions;
        } catch (aiError) {
            console.error("Resume question generation failed:", aiError);
            questions = [
                "Can you walk me through one of the key projects mentioned in your resume?",
                "Based on your experience, how do you approach learning new technologies?",
                "What was the most challenging technical problem you solved in your recent role?",
                "How do you ensure the quality and maintainability of the code you write?",
                "Can you discuss a time you had to collaborate with a team to deliver a project?"
            ];
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
            return { success: true, data: doc.data() };
        }
        return { success: false };
    } catch (error) {
        console.error("Error getting resume:", error);
        return { success: false };
    }
}
