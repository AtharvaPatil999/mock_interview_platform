import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, CheckCircle2, AlertCircle, TrendingUp, BookOpen } from "lucide-react";
import { getFeedbackByInterviewId, getInterviewById } from "@/lib/actions/general.action";
import { getCurrentUser } from "@/lib/actions/auth.action";

const FeedbackPage = async ({ params }: RouteParams) => {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const interview = await getInterviewById(id);
  const feedback = await getFeedbackByInterviewId({ interviewId: id, userId: user.id });

  if (!feedback) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-2xl font-bold">Feedback Not Ready</h2>
        <p className="text-gray-400">Please complete the interview session first.</p>
        <Link href={`/interview/${id}`} className="btn-primary px-6 py-2 rounded-lg">
          Start Interview
        </Link>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500 border-green-500/20 bg-green-500/10";
    if (score >= 50) return "text-yellow-500 border-yellow-500/20 bg-yellow-500/10";
    return "text-red-500 border-red-500/20 bg-red-500/10";
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto py-8">
      <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit">
        <ChevronLeft size={20} /> Back to Dashboard
      </Link>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold capitalize">{interview?.role} Interview Feedback</h1>
        <p className="text-gray-400" suppressHydrationWarning>Completed on {feedback.endedAt ? new Date(feedback.endedAt).toLocaleDateString() : new Date(feedback.createdAt).toLocaleDateString()}</p>
      </div>

      {feedback.summary && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 italic text-gray-300">
          <span className="text-primary font-bold not-italic block mb-2 uppercase text-xs tracking-widest">Executive Summary</span>
          "{feedback.summary}"
        </div>
      )}

      {/* Score Card */}
      <div className={`p-10 rounded-3xl border flex flex-col items-center gap-4 text-center ${getScoreColor(feedback.totalScore)}`}>
        <span className="text-sm font-semibold uppercase tracking-wider">Overall Preparedness Score</span>
        <div className="text-7xl font-bold">{feedback.totalScore}%</div>
        <p className="max-w-md opacity-80">{feedback.finalAssessment}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-dark-200 border border-dark-300 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-green-500">
            <TrendingUp size={24} />
            <h3 className="text-xl font-bold text-white">Major Strengths</h3>
          </div>
          <ul className="flex flex-col gap-3">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-gray-300">
                <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-1" />
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Areas for Improvement */}
        <div className="bg-dark-200 border border-dark-300 rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertCircle size={24} />
            <h3 className="text-xl font-bold text-white">Areas to Improve</h3>
          </div>
          <ul className="flex flex-col gap-3">
            {feedback.areasForImprovement.map((a, i) => (
              <li key={i} className="flex gap-2 text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0 mt-2.5" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recommendations / Next Steps */}
      {feedback.recommendations && feedback.recommendations.length > 0 && (
        <div className="bg-dark-400 border border-primary/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <TrendingUp size={28} className="text-primary" />
            Clear Next-Step Recommendations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {feedback.recommendations.map((rec, i) => (
              <div key={i} className="bg-dark-200/50 backdrop-blur-sm border border-dark-300 p-5 rounded-xl flex gap-4 transition-all hover:border-primary/50 group">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-sm shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                  {i + 1}
                </div>
                <p className="text-gray-200 leading-relaxed font-medium">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Scores */}
      <div className="bg-dark-200 border border-dark-300 rounded-2xl p-6">
        <h3 className="text-xl font-bold mb-6">Detailed Assessment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {feedback.categoryScores.map((cat, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{cat.name}</span>
                <span className="font-bold">{cat.score}%</span>
              </div>
              <div className="w-full bg-dark-300 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-1000"
                  style={{ width: `${cat.score}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{cat.comment}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transcript Viewer */}
      <div className="bg-dark-200 border border-dark-300 rounded-2xl p-6 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-primary" />
          <h3 className="text-lg font-semibold">Interview Transcript</h3>
        </div>

        <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {feedback.transcript && feedback.transcript.length > 0 ? (
            feedback.transcript.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col gap-1 max-w-[85%] ${msg.role === "assistant" || msg.role === "interviewer"
                  ? "self-start"
                  : "self-end items-end"
                  }`}
              >
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-500">
                  <span>{msg.role === "assistant" || msg.role === "interviewer" ? "Interviewer" : "You"}</span>
                  <span>•</span>
                  <span suppressHydrationWarning>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div
                  className={`p-3 rounded-2xl text-sm ${msg.role === "assistant" || msg.role === "interviewer"
                    ? "bg-dark-300 text-gray-200 rounded-tl-none"
                    : "bg-primary/20 text-primary border border-primary/20 rounded-tr-none"
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-gray-500 italic">
              No transcript data available for this session.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackPage;
