"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import { Clock, BarChart3, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createResumeInterview } from "@/lib/actions/resume.action";
import { db } from "@/firebase/client"; // Use client db for simple creation or actions
import { collection, addDoc } from "firebase/firestore";

interface InterviewSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: "resume" | "role";
    userId: string;
    role?: string;
    resumeData?: {
        text: string;
        summary: string;
    };
}

const InterviewSetupModal = ({
    isOpen,
    onClose,
    type,
    userId,
    role: initialRole,
    resumeData,
}: InterviewSetupModalProps) => {
    const router = useRouter();
    const [duration, setDuration] = useState(25);
    const [difficulty, setDifficulty] = useState("Medium");
    const [role, setRole] = useState(initialRole || "");
    const [isPending, setIsPending] = useState(false);

    const handleStart = async () => {
        if (!role) {
            toast.error("Please enter a role");
            return;
        }

        setIsPending(true);
        try {
            if (type === "resume" && resumeData) {
                const result = await createResumeInterview({
                    userId,
                    role,
                    summary: resumeData.summary,
                    extractedText: resumeData.text,
                    duration,
                    difficulty,
                });

                if (result.success && result.interviewId) {
                    router.push(`/interview/${result.interviewId}`);
                } else {
                    toast.error("Failed to create interview");
                }
            } else {
                // Role-based interview creation
                // For simplicity, we can just create it here or via action
                const interviewData = {
                    userId,
                    role,
                    level: difficulty,
                    questions: [], // Will be generated dynamically in session
                    techstack: [role.split(" ")[0]], // Basic techstack from role
                    createdAt: new Date().toISOString(),
                    type: "Role-based",
                    finalized: false,
                    duration,
                    difficulty,
                    sourceType: "role",
                };

                const docRef = await addDoc(collection(db, "interviews"), interviewData);
                router.push(`/interview/${docRef.id}`);
            }
        } catch (error) {
            console.error("Setup error:", error);
            toast.error("Error starting interview");
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Interview Setup">
            <div className="flex flex-col gap-6">
                {/* Role Input (if not resume-based or not provided) */}
                {!initialRole && (
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-400">Target Role</label>
                        <input
                            type="text"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            placeholder="e.g. Java Developer"
                            className="bg-dark-100 border border-dark-300 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                        />
                    </div>
                )}

                {/* Duration Selection */}
                <div className="flex flex-col gap-3">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <Clock size={16} /> Interview Duration
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {[25, 45, 60].map((d) => (
                            <button
                                key={d}
                                onClick={() => setDuration(d)}
                                className={`py-3 rounded-xl border transition-all ${duration === d
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "bg-dark-100 border-dark-300 text-gray-400 hover:border-gray-500"
                                    }`}
                            >
                                {d} Min
                            </button>
                        ))}
                    </div>
                </div>

                {/* Difficulty Selection */}
                <div className="flex flex-col gap-3">
                    <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <BarChart3 size={16} /> Difficulty Level
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                        {["Easy", "Medium", "Hard"].map((lvl) => (
                            <button
                                key={lvl}
                                onClick={() => setDifficulty(lvl)}
                                className={`py-3 rounded-xl border transition-all ${difficulty === lvl
                                        ? "bg-primary/10 border-primary text-primary"
                                        : "bg-dark-100 border-dark-300 text-gray-400 hover:border-gray-500"
                                    }`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleStart}
                    disabled={isPending}
                    className="btn-primary w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 mt-4"
                >
                    {isPending ? (
                        <Loader2 className="animate-spin" />
                    ) : (
                        <>
                            Start Interview <ChevronRight size={20} />
                        </>
                    )}
                </button>
            </div>
        </Modal>
    );
};

export default InterviewSetupModal;
