import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { transcript, difficulty, role } = body;

        // Call FastAPI ML Service
        const mlResponse = await fetch("http://localhost:8000/analyze", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ transcript, difficulty, role }),
        });

        if (!mlResponse.ok) {
            throw new Error("ML Service failed");
        }

        const analysis = await mlResponse.json();

        return NextResponse.json(analysis);
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Feedback analysis failed" }, { status: 500 });
    }
}
