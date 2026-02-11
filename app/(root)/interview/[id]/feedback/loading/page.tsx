"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/client";
import FeedbackLoading from "@/components/FeedbackLoading";
import { auth } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { AlertCircle } from "lucide-react";

const LoadingPage = () => {
    const router = useRouter();
    const { id: interviewId } = useParams();
    const [userId, setUserId] = useState<string | null>(null);
    const [showTimeout, setShowTimeout] = useState(false);
    const [timeoutSeconds, setTimeoutSeconds] = useState(30);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                router.push("/sign-in");
            }
        });

        return () => unsubscribeAuth();
    }, [router]);

    // Timeout countdown
    useEffect(() => {
        if (!userId || !interviewId) return;

        const countdownInterval = setInterval(() => {
            setTimeoutSeconds((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownInterval);
                    setShowTimeout(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(countdownInterval);
    }, [userId, interviewId]);

    useEffect(() => {
        if (!userId || !interviewId) return;

        console.log(`[LoadingPage] Listening for feedback for interview: ${interviewId}`);

        const q = query(
            collection(db, "feedback"),
            where("interviewId", "==", interviewId),
            where("userId", "==", userId)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                if (!snapshot.empty) {
                    console.log("[LoadingPage] ✅ Feedback found! Redirecting...");
                    router.push(`/interview/${interviewId}/feedback`);
                }
            },
            (error) => {
                console.error("[LoadingPage] ❌ Firestore listener error:", error);
                // Don't stop listening - keep trying
            }
        );

        // Keep listener active even after timeout
        return () => unsubscribe();
    }, [interviewId, userId, router]);

    const handleGoToDashboard = () => {
        router.push("/");
    };

    const handleRetry = () => {
        // Force refresh by navigating to the same page
        router.refresh();
        setShowTimeout(false);
        setTimeoutSeconds(30);
    };

    return (
        <div className="max-w-4xl mx-auto py-20 px-4">
            {!showTimeout ? (
                <>
                    <FeedbackLoading />
                    <div className="text-center mt-6 text-sm text-gray-500">
                        Timeout in {timeoutSeconds}s...
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
                        <AlertCircle size={64} className="text-yellow-500 relative z-10" />
                    </div>

                    <div className="flex flex-col gap-4 relative z-10 max-w-lg">
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                            Feedback is Taking Longer Than Expected
                        </h2>
                        <p className="text-gray-400">
                            Your feedback is still being generated in the background. You can:
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 mt-4 justify-center">
                            <button
                                onClick={handleRetry}
                                className="px-6 py-3 bg-primary hover:bg-primary/80 text-white rounded-lg font-medium transition-colors"
                            >
                                Check Again
                            </button>
                            <button
                                onClick={handleGoToDashboard}
                                className="px-6 py-3 bg-dark-300 hover:bg-dark-200 text-white rounded-lg font-medium transition-colors border border-gray-700"
                            >
                                Go to Dashboard
                            </button>
                        </div>

                        <p className="text-xs text-gray-500 mt-4">
                            💡 Tip: Your feedback will appear in your interview history once it's ready. The listener is still active in the background.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LoadingPage;
