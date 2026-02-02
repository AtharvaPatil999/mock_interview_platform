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
        <p className="text-gray-400">Completed on {new Date(feedback.createdAt).toLocaleDateString()}</p>
      </div>

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

      {/* Transcript Holder (Placeholder for now) */}
      <div className="bg-dark-200 border border-dark-300 rounded-2xl p-6">
        <div className="flex items-center justify-between cursor-pointer group">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            <h3 className="text-lg font-semibold">Interview Transcript</h3>
          </div>
          <span className="text-sm text-primary group-hover:underline">View Full Session</span>
        </div>
        <p className="text-sm text-gray-500 mt-2 italic">The full transcript will be available here soon.</p>
      </div>
    </div>
  );
};

export default FeedbackPage;
