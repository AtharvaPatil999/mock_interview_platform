"use server";

import * as pdf from "pdf-parse";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { db } from "@/firebase/admin";

export async function processResumeAction(fileBuffer: Buffer, userId: string) {
    try {
        const pdfParser = (pdf as any).default || pdf;
        const data = await pdfParser(fileBuffer);
        const text = data.text;

        const { text: summary } = await generateText({
            model: google("gemini-2.0-flash-001"),
            prompt: `Summarize the following resume text focusing on skills, experience, and projects. Keep it concise.
      
      Resume Text:
      ${text}`,
        });

        // We can also store the extracted text in Firestore if needed
        // But for now, we'll return it to the client to be used in interview setup

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

        const { text: questionsText } = await generateText({
            model: google("gemini-1.5-pro-late-20241031"),
            prompt: `Generate 5 interview questions based on the candidate's resume and the role ${role}.
      
      Resume Summary: ${summary}
      Extracted Text: ${extractedText}
      
      Difficulty: ${difficulty}
      
      Format: Return only the questions as a numbered list.`,
        });

        const questions = questionsText
            .split("\n")
            .filter((line) => line.trim().match(/^\d+\./))
            .map((line) => line.replace(/^\d+\.\s*/, "").trim());

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
