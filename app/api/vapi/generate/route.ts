import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { auth, db } from "@/firebase/admin";
import { getInterviewCover } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const token = request.headers
      .get("authorization")
      ?.replace("Bearer ", "");

    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }

    const decoded = await auth.verifyIdToken(token);

    const { type, role, level, techstack, amount } =
      await request.json();

    const { text: questions } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `Prepare questions for a job interview.
        The job role is ${role}.
        The job experience level is ${level}.
        The tech stack used is ${techstack}.
        Focus should lean towards ${type}.
        Amount of questions: ${amount}.
        Return only JSON array like:
        ["Question 1", "Question 2"]
      `,
    });

    const interview = {
      role,
      type,
      level,
      techstack: techstack.split(","),
      questions: JSON.parse(questions),
      userId: decoded.uid, // ✅ REAL USER
      finalized: true,
      coverImage: getInterviewCover(decoded.uid),
      createdAt: new Date().toISOString(),
    };

    await db.collection("interviews").add(interview);

    return Response.json({ success: true });
  } catch (error) {
    console.error(error);
    return new Response("Server error", { status: 500 });
  }
}

export async function GET() {
  return Response.json({ success: true, message: "API is alive" });
}
