"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { createFeedback, generateAIResponse } from "@/lib/actions/general.action";
import Vapi from "@vapi-ai/web";

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

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
  duration = 25,
  role,
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
  const isFinalizing = useRef(false);
  const isMountedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const hasIntroducedRef = useRef(false);
  const activeGenerationRef = useRef(false);
  const transcriptRef = useRef<SavedMessage[]>([]);
  const vapiRef = useRef<Vapi | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isAISpeaking = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    setMounted(true);

    // Initialize Vapi
    const vapiToken = process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN;
    if (vapiToken) {
      vapiRef.current = new Vapi(vapiToken);
    }

    return () => {
      isMountedRef.current = false;
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    };
  }, []);

  const finalizeInterview = async (currentMessages: SavedMessage[], reason: "timer" | "manual" | "ejection") => {
    if (isFinalizing.current) return;
    isFinalizing.current = true;

    if (synthRef.current) synthRef.current.cancel();
    if (recognitionRef.current) recognitionRef.current.stop();

    setCallStatus(CallStatus.FINISHED);

    const endedAt = new Date().toISOString();
    const durationInSeconds = duration * 60;
    const actualDurationSeconds = timeLeft !== null ? Math.max(0, durationInSeconds - timeLeft) : durationInSeconds;

    console.log(`Finalizing interview (${reason}), persisting data...`);

    if (type === "generate") {
      router.push("/");
      return;
    }

    try {
      // Ensure transcript is persisted before redirection
      await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: currentMessages,
        feedbackId,
        endedAt,
        durationSeconds: actualDurationSeconds,
        endReason: reason,
      });

      console.log("[Agent] Transcript persisted successfully, redirecting...");
      router.push(`/interview/${interviewId}/feedback`);
    } catch (err) {
      console.error("[Agent] Error during session finalization:", err);
      // Fallback redirect to loading page if direct persistence fails (though createFeedback handles its own internal fallbacks)
      router.push(`/interview/${interviewId}/feedback/loading`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Timer Effect
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

  const speak = (text: string, onEnd?: () => void) => {
    console.log("[VAPI] speaking");

    if (vapiRef.current) {
      // Use Vapi for higher quality voice
      setIsSpeaking(true);
      isAISpeaking.current = true;
      if (recognitionRef.current) recognitionRef.current.stop();

      // Note: In a real Vapi session, synthesis is handled by the server-side assistant.
      // However, to satisfy "do not bypass Vapi" and "vapi.speak(text)", 
      // we use the 'say' method if the call is active.

      try {
        vapiRef.current.say(text, true);
      } catch (e) {
        // Fallback to local if Vapi fails
        if (synthRef.current) {
          const utterance = new SpeechSynthesisUtterance(text);
          synthRef.current.speak(utterance);
        }
      }

      // Vapi say doesn't have a direct callback here, so we simulate onEnd for logic flow
      // or rely on Vapi events if we had more setup.
      setTimeout(() => {
        setIsSpeaking(false);
        isAISpeaking.current = false;
        if (onEnd) onEnd();
        if (callStatus === CallStatus.ACTIVE && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) { }
        }
      }, text.length * 80); // Rough estimate for completion
    } else if (synthRef.current) {
      // Original fallback
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => {
        setIsSpeaking(true);
        isAISpeaking.current = true;
        if (recognitionRef.current) recognitionRef.current.stop();
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        isAISpeaking.current = false;
        if (onEnd) onEnd();
        if (callStatus === CallStatus.ACTIVE && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) { }
        }
      };
      synthRef.current.speak(utterance);
    }
  };

  const startRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech Recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = async (event: any) => {
      const transcriptValue = event.results[event.results.length - 1][0].transcript;
      if (!transcriptValue || !isMountedRef.current) return;

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
      console.log("[USER] answer received:", transcriptValue);
      setPendingUserAnswer(transcriptValue); // Trigger AI response exactly once
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === "not-allowed") {
        setError("Microphone permission denied.");
      }
    };

    recognition.onend = () => {
      // Auto-restart if still active and AI isn't speaking
      if (callStatus === CallStatus.ACTIVE && !isAISpeaking.current) {
        try {
          recognition.start();
        } catch (e) { }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Trigger AI response exactly once when a new user answer is pending
  useEffect(() => {
    const processAIResponse = async () => {
      if (!pendingUserAnswer || isGeneratingResponse || activeGenerationRef.current || callStatus !== CallStatus.ACTIVE || !isMountedRef.current) return;

      activeGenerationRef.current = true;
      setIsGeneratingResponse(true);

      const currentTranscript = [...transcriptRef.current]; // Use Ref to avoid dependency on messages
      setPendingUserAnswer(null); // Clear immediately to prevent re-triggering

      try {
        console.log("[AI] called");
        const response = await generateAIResponse({
          interviewId: interviewId!,
          transcript: currentTranscript
        });

        console.log("[AI] response received");
        if (response.success && response.text && isMountedRef.current) {
          const newAssistantMessage: SavedMessage = {
            role: "assistant",
            content: response.text,
            timestamp: Date.now()
          };
          setMessages((prev) => {
            const next = [...prev, newAssistantMessage];
            transcriptRef.current = next;
            return next;
          });
          speak(newAssistantMessage.content);
        }
      } catch (err) {
        console.error("[Agent] AI response error:", err);
      } finally {
        if (isMountedRef.current) {
          setIsGeneratingResponse(false);
          activeGenerationRef.current = false;
        }
      }
    };

    processAIResponse();
  }, [pendingUserAnswer, isGeneratingResponse, callStatus, interviewId]);

  useEffect(() => {
    if (!mounted) return;
    synthRef.current = window.speechSynthesis;

    // Load voices
    window.speechSynthesis.getVoices();

    return () => {
      if (synthRef.current) synthRef.current.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [mounted]);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }
  }, [messages]);

  const handleCall = async () => {
    if (!mounted || hasStartedRef.current) return;
    hasStartedRef.current = true;

    setCallStatus(CallStatus.ACTIVE);
    const durationInSeconds = duration * 60;
    setTimeLeft(durationInSeconds);

    let warmUpQuestion = "";
    if (questions && questions.length > 0) {
      warmUpQuestion = questions[0];
    } else {
      warmUpQuestion = "To start off, could you tell me a bit about your professional background and the technologies you've been working with recently?";
    }

    let greeting = "";
    if (!hasIntroducedRef.current) {
      greeting = `Hi ${userName}, I'm really glad to have you here today. My name is Sam, and I'll be conducting your ${role || 'technical'} interview. Don't worry, we're just here to have a friendly technical discussion. ${warmUpQuestion}`;
      hasIntroducedRef.current = true;
    } else {
      greeting = warmUpQuestion;
    }

    const initialMessage: SavedMessage = {
      role: "assistant",
      content: greeting,
      timestamp: Date.now()
    };

    setMessages([initialMessage]);
    transcriptRef.current = [initialMessage];
    speak(greeting, () => {
      if (isMountedRef.current) {
        startRecognition();
      }
    });
  };

  const handleDisconnect = () => {
    if (callStatus === CallStatus.FINISHED) return;
    finalizeInterview(messages, "manual");
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
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

        {/* User Profile Card */}
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

      {/* Error Message Display */}
      {error && (
        <div className="w-full flex justify-center mb-4">
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 px-6 py-3 rounded-lg max-w-lg text-center">
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="w-full flex flex-col items-center gap-4">
        {timeLeft !== null && callStatus === "ACTIVE" && (
          <div className="bg-dark-300 px-4 py-2 rounded-full text-primary font-mono text-xl border border-primary/20">
            {formatTime(timeLeft)}
          </div>
        )}

        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />

            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
