"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createFeedback } from "@/lib/actions/general.action";
import { toast } from "sonner";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
  timestamp: number;
}

interface AgentProps {
  userName: string;
  userId?: string;
  interviewId?: string;
  feedbackId?: string;
  type: "interview" | "generate";
  questions?: string[];
  duration?: number;
  role?: string;
  difficulty?: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  duration = 25,
  role,
  difficulty = "Medium",
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [pendingUserAnswer, setPendingUserAnswer] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const isFinalizing = useRef(false);
  const isMountedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const activeGenerationRef = useRef(false);
  const transcriptRef = useRef<SavedMessage[]>([]);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isAISpeaking = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    setMounted(true);
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
      console.log("[AGENT] SpeechSynthesis initialized");
    }

    return () => {
      isMountedRef.current = false;
      if (synthRef.current) synthRef.current.cancel();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) { }
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callStatus === CallStatus.ACTIVE && timeLeft !== null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (timeLeft === 0 && callStatus === CallStatus.ACTIVE) {
      finalizeInterview(messages, "timer");
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callStatus, timeLeft, messages]);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }
  }, [messages]);

  const speak = (text: string, onEnd?: () => void) => {
    console.log("[AGENT] speak requested:", text);
    if (!synthRef.current) {
      console.error("[AGENT] SpeechSynthesis not available");
      return;
    }

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      console.log("[AGENT] Speech started");
      setIsSpeaking(true);
      isAISpeaking.current = true;
      // Stop recognition while speaking to avoid feedback loops
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) { }
      }
    };

    utterance.onend = () => {
      console.log("[AGENT] Speech ended");
      setIsSpeaking(false);
      isAISpeaking.current = false;
      if (onEnd) onEnd();

      // Auto-start recognition after AI finishes speaking
      if (callStatus === CallStatus.ACTIVE && !isGeneratingResponse) {
        console.log("[AGENT] Recognition starting after speech end");
        startRecognition();
      }
    };

    utterance.onerror = (event) => {
      console.error("[AGENT] Speech error:", event);
      setIsSpeaking(false);
      isAISpeaking.current = false;
    };

    synthRef.current.speak(utterance);
  };

  const startRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error("[AGENT] SpeechRecognition not supported");
      setError("Speech Recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    // Clean up previous instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Turn-based: stop after one final result
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      console.log("[AGENT] Recognition started - Listening...");
    };

    recognition.onresult = (event: any) => {
      const transcriptValue = event.results[event.results.length - 1][0].transcript;
      if (!transcriptValue || !isMountedRef.current) return;

      console.log("[AGENT] Transcript captured:", transcriptValue);
      const newUserMessage: SavedMessage = {
        role: "user",
        content: transcriptValue,
        timestamp: Date.now()
      };

      setMessages((prev) => {
        const next = [...prev, newUserMessage];
        transcriptRef.current = next;
        return next;
      });
      setPendingUserAnswer(transcriptValue);
    };

    recognition.onerror = (event: any) => {
      console.warn("[AGENT] Recognition error:", event.error);
      if (event.error === "no-speech" && callStatus === CallStatus.ACTIVE && !isAISpeaking.current) {
        // Restart if no speech was detected
        setTimeout(() => startRecognition(), 100);
      }
    };

    recognition.onend = () => {
      console.log("[AGENT] Recognition ended");
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error("[AGENT] Recognition start failed:", e);
    }
  };

  // Turn-based AI Response Effect
  useEffect(() => {
    const processAIResponse = async () => {
      if (!pendingUserAnswer || isGeneratingResponse || activeGenerationRef.current || callStatus !== CallStatus.ACTIVE || !isMountedRef.current || !sessionId) return;

      console.log("[AGENT] Processing answer for sessionId:", sessionId);
      activeGenerationRef.current = true;
      setIsGeneratingResponse(true);

      const capturedAnswer = pendingUserAnswer;
      setPendingUserAnswer(null);

      try {
        const res = await fetch("/api/interview/respond", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, userInput: capturedAnswer })
        });

        const data = await res.json();
        console.log("[AGENT] Respond API data:", data);

        if (data.message && isMountedRef.current) {
          const newAssistantMessage: SavedMessage = {
            role: "assistant",
            content: data.message,
            timestamp: Date.now()
          };
          setMessages((prev) => {
            const next = [...prev, newAssistantMessage];
            transcriptRef.current = next;
            return next;
          });

          if (data.final) {
            console.log("[AGENT] Session final reached");
            speak(data.closingMessage || data.message, () => {
              finalizeInterview(transcriptRef.current, "manual");
            });
          } else {
            speak(data.message);
          }
        }
      } catch (err) {
        console.error("[AGENT] Respond API error:", err);
      } finally {
        if (isMountedRef.current) {
          setIsGeneratingResponse(false);
          activeGenerationRef.current = false;
        }
      }
    };

    processAIResponse();
  }, [pendingUserAnswer, isGeneratingResponse, callStatus, sessionId]);

  const handleCall = async () => {
    if (!mounted || hasStartedRef.current) return;
    console.log("[AGENT] handleCall triggered");

    hasStartedRef.current = true;
    setCallStatus(CallStatus.ACTIVE);

    const durationInSeconds = duration * 60;
    setTimeLeft(durationInSeconds);

    const newSessionId = crypto.randomUUID();
    setSessionId(newSessionId);
    console.log("[AGENT] New Session ID:", newSessionId);

    try {
      console.log("[AGENT] Requesting start from backend...");
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: newSessionId,
          userName,
          userId,
          interviewId,
          difficulty,
          duration,
          role: role || "Technical",
          questions: [] // Questions are handled server-side now
        })
      });

      const data = await res.json();
      console.log("[AGENT] Start API data:", data);

      if (data.error && isMountedRef.current) {
        toast.error(data.error);
        setError(data.error);
        setCallStatus(CallStatus.INACTIVE);
        hasStartedRef.current = false;
        return;
      }

      if (data.message && isMountedRef.current) {
        const initialMessage: SavedMessage = {
          role: "assistant",
          content: data.message,
          timestamp: Date.now()
        };

        setMessages([initialMessage]);
        transcriptRef.current = [initialMessage];

        // Always speak the greeting immediately
        speak(data.message, () => {
          console.log("[AGENT] Greeting finished, loop started");
        });
      }
    } catch (err: any) {
      console.error("[AGENT] Start API error:", err);
      const msg = "Unable to connect to the interview service. Please ensure the backend is running.";
      toast.error(msg);
      setError(msg);
      setCallStatus(CallStatus.INACTIVE);
      hasStartedRef.current = false;
    }
  };

  const finalizeInterview = async (currentMessages: SavedMessage[], reason: "timer" | "manual" | "ejection") => {
    if (isFinalizing.current) return;
    isFinalizing.current = true;
    console.log("[AGENT] Finalizing interview, reason:", reason);

    if (synthRef.current) synthRef.current.cancel();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) { }
    }

    setCallStatus(CallStatus.FINISHED);

    const endedAt = new Date().toISOString();
    const durationInSeconds = duration * 60;
    const actualDurationSeconds = timeLeft !== null ? Math.max(0, durationInSeconds - timeLeft) : durationInSeconds;

    if (type === "generate") {
      router.push("/");
      return;
    }

    try {
      await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: currentMessages,
        feedbackId,
        endedAt,
        durationSeconds: actualDurationSeconds,
        endReason: reason,
      });

      console.log("[AGENT] Feedback created, redirecting...");
      router.push(`/interview/${interviewId}/feedback`);
    } catch (err) {
      console.error("[AGENT] Feedback creation error:", err);
      router.push(`/interview/${interviewId}/feedback/loading`);
    }
  };

  const handleDisconnect = () => {
    if (callStatus === CallStatus.FINISHED) return;
    finalizeInterview(messages, "manual");
  };

  if (!mounted) return null;

  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="w-full flex justify-center mb-4">
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-6 py-3 rounded-lg max-w-lg text-center">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="w-full flex flex-col items-center gap-4">
        {timeLeft !== null && callStatus === CallStatus.ACTIVE && (
          <div className="bg-dark-300 px-4 py-2 rounded-full text-primary font-mono text-xl border border-primary/20">
            {formatTime(timeLeft)}
          </div>
        )}

        {callStatus !== CallStatus.ACTIVE ? (
          <button className="relative btn-call" onClick={handleCall}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus === CallStatus.CONNECTING && "bg-primary"
              )}
            />
            <span className="relative">
              {callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={handleDisconnect}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
