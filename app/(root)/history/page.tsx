import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Calendar, BarChart3, Clock, ArrowRight } from "lucide-react";
import { getInterviewsByUserId } from "@/lib/actions/general.action";
import { getCurrentUser } from "@/lib/actions/auth.action";

const HistoryPage = async () => {
    const user = await getCurrentUser();
    if (!user) redirect("/sign-in");

    const interviews = await getInterviewsByUserId(user.id) || [];

    return (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto py-8">
            <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors w-fit">
                <ChevronLeft size={20} /> Back to Dashboard
            </Link>

            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Interview History</h1>
                <p className="text-gray-400">Review your past sessions and track your progress.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {interviews.length > 0 ? (
                    interviews.map((interview) => (
                        <div key={interview.id} className="bg-dark-200 border border-dark-300 rounded-2xl p-6 hover:border-primary/50 transition-all group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl font-bold capitalize">{interview.role}</h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${interview.type === "Resume-based" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                                            }`}>
                                            {interview.type}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={16} />
                                            {new Date(interview.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <BarChart3 size={16} />
                                            {interview.level || interview.difficulty}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} />
                                            {interview.duration} Min
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {interview.finalized ? (
                                        <Link
                                            href={`/interview/${interview.id}/feedback`}
                                            className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl transition-all"
                                        >
                                            View Feedback <ArrowRight size={18} />
                                        </Link>
                                    ) : (
                                        <Link
                                            href={`/interview/${interview.id}`}
                                            className="bg-dark-300 hover:bg-dark-400 text-white flex items-center gap-2 px-6 py-3 rounded-xl transition-all"
                                        >
                                            Continue Session <ArrowRight size={18} />
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-dark-200 rounded-3xl border border-dashed border-dark-300 text-center gap-4">
                        <p className="text-gray-400 italic">No interviews found yet.</p>
                        <Link href="/" className="text-primary hover:underline">Start your first interview</Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryPage;
