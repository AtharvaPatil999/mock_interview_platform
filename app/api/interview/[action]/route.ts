import { NextRequest, NextResponse } from "next/server";

const INTERVIEW_SERVICE_URL = process.env.INTERVIEW_SERVICE_URL || "http://localhost:8001";

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ action: string }> }
) {
    const { action } = await context.params;
    const body = await req.json();

    try {
        const response = await fetch(`${INTERVIEW_SERVICE_URL}/interview/${action}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Proxy] Service error (${response.status}):`, errorText);
            return NextResponse.json(
                { error: "Interview service error" },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error(`[Proxy] Connection error to ${INTERVIEW_SERVICE_URL}:`, error.message);
        return NextResponse.json(
            { error: "Interview service unreachable. Ensure it's running on port 8000." },
            { status: 503 }
        );
    }
}
