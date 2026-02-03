"use server";

import * as pdf from "pdf-parse";
import { google } from "@ai-sdk/google";
import { generateText, generateObject } from "ai";
import { z } from "zod";
import { db } from "@/firebase/admin";

export async function processResumeAction(binaryData: Uint8Array | Buffer, userId: string) {
    try {
        const fileBuffer = Buffer.from(binaryData);
        const pdfParser = (pdf as any).default || pdf;
        const data = await pdfParser(fileBuffer);
        const text = data.text;

        const { text: summary } = await generateText({
            model: google("gemini-2.0-flash-001"),
            prompt: `Summarize the following resume text focusing on skills, experience, and projects. Keep it concise.
      
      Resume Text:
      ${text}`,
        });

        // Store the extracted text and summary in Firestore
        await db.collection("resumes").doc(userId).set({
            userId,
            extractedText: text,
            summary: summary,
            status: "processed",
            updatedAt: new Date().toISOString()
        });

        return {
            success: true,
            extractedText: text,
            summary: summary
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

        const questions = questionsObject.questions;

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
