"use client";

import { Loader2 } from "lucide-react";

const FeedbackLoading = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                <Loader2 size={64} className="text-primary animate-spin relative z-10" />
            </div>

            <div className="flex flex-col gap-2 relative z-10">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                    Analyzing Your Interview
                </h2>
                <p className="text-gray-400 max-w-sm mx-auto">
                    Please wait while our AI engine generates your detailed feedback and preparedness score. This usually takes a few seconds.
                </p>
            </div>

            <div className="flex gap-2 items-center text-xs text-gray-500 font-mono uppercase tracking-[0.2em] mt-4">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                Processing transcript
            </div>
        </div>
    );
};

export default FeedbackLoading;
