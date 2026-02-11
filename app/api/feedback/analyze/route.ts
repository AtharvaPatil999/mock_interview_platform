import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { transcript, difficulty, role } = body;

        console.log("[API /feedback/analyze] Received request");

        // Call FastAPI ML Service with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        try {
            const mlResponse = await fetch("http://localhost:8000/analyze", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ transcript, difficulty, role }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!mlResponse.ok) {
                console.warn("[API /feedback/analyze] ML Service returned error:", mlResponse.status);
                throw new Error("ML Service failed");
            }

            const analysis = await mlResponse.json();
            console.log("[API /feedback/analyze] ✅ ML Service succeeded");
            return NextResponse.json(analysis);
        } catch (mlError: any) {
            clearTimeout(timeoutId);

            if (mlError.name === 'AbortError') {
                console.warn("[API /feedback/analyze] ⏱️ ML Service timeout");
            } else {
                console.warn("[API /feedback/analyze] ❌ ML Service error:", mlError.message);
            }

            // Return partial/fallback data instead of error
            return NextResponse.json({
                status: "completed",
                preparedness_score: 50,
                strengths: ["Completed the interview session"],
                weaknesses: [],
                improvement_areas: ["Focus on providing more detailed technical explanations"],
                technical_keyword_usage: 0,
                filler_word_ratio: 0,
                source: "fallback",
            });
        }
    } catch (error) {
        console.error("[API /feedback/analyze] ❌ Critical error:", error);
        return NextResponse.json({
            status: "completed",
            preparedness_score: 40,
            strengths: ["Participated in the interview"],
            weaknesses: [],
            improvement_areas: ["Session completed - technical analysis encountered an error"],
            technical_keyword_usage: 0,
            filler_word_ratio: 0,
            source: "error_fallback",
        }, { status: 200 }); // Return 200 to prevent upstream errors
    }
}
