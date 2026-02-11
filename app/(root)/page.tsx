"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Code2, Globe, TestTube, FileText, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";
import ResumeUpload from "@/components/ResumeUpload";
import RoleCard from "@/components/RoleCard";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getFeedbackByInterviewId,
} from "@/lib/actions/general.action";
import { getResumeByUserId } from "@/lib/actions/resume.action";
import { getChallengeStats } from "@/lib/actions/challenge.action";
import { useUser } from "@/components/UserProvider";
import { Code, Trophy, Database } from "lucide-react";
import { seedChallenges } from "@/lib/actions/seed.action";
import { toast } from "sonner";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const user = useUser();
  const [userInterviews, setUserInterviews] = useState<Interview[]>([]);
  const [feedbacks, setFeedbacks] = useState<Record<string, Feedback | null>>({});
  const [initialResumeData, setInitialResumeData] = useState<any>(null);
  const [challengeStats, setChallengeStats] = useState({ completedCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user) {
          const [interviews, resumeResponse, stats] = await Promise.all([
            getInterviewsByUserId(user.id),
            getResumeByUserId(user.id),
            getChallengeStats(user.id)
          ]);
          setUserInterviews(interviews || []);
          setChallengeStats(stats);
          if (resumeResponse?.success) {
            setInitialResumeData(resumeResponse.data);
          }

          // Fetch feedbacks for recent interviews
          if (interviews && interviews.length > 0) {
            const feedbackPromises = interviews.slice(0, 4).map(async (interview) => {
              try {
                if (!interview.id) return { id: null, fb: null };
                const fb = await getFeedbackByInterviewId({
                  interviewId: interview.id,
                  userId: user.id
                });
                return { id: interview.id, fb };
              } catch (err) {
                console.error(`Error fetching feedback for ${interview.id}:`, err);
                return { id: interview.id, fb: null };
              }
            });

            const results = await Promise.all(feedbackPromises);
            const feedbackMap: Record<string, Feedback | null> = {};
            results.forEach(res => {
              if (res.id) {
                feedbackMap[res.id] = res.fb;
              }
            });
            setFeedbacks(feedbackMap);
          }
        }
      } catch (error) {
        console.error("Error fetching home data:", error);
      } finally {
        setLoading(false);
        setMounted(true);
      }
    };

    fetchData();
  }, []);

  const predefinedRoles = [
    { role: "Java Developer", icon: <Code2 size={24} /> },
    { role: "Python Developer", icon: <Database size={24} /> },
    { role: "Golang Developer", icon: <Globe size={24} /> },
    { role: "Software Tester", icon: <TestTube size={24} /> },
  ];

  if (!mounted || loading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const safeUserInterviews = userInterviews || [];
  const hasPastInterviews = safeUserInterviews.length > 0;

  return (
    <main className="flex flex-col gap-10">
      {/* CTA SECTION */}
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-primary">Welcome, {user?.name || "User"}</h1>
            <p className="text-gray-400">{user?.email}</p>
          </div>

          <h2>
            Get Interview-Ready with AI-Powered Practice & Feedback via PrepWise
          </h2>

          <div className="flex flex-col gap-1">
            <p className="text-lg">
              Practice real interview questions & get instant feedback
            </p>
            <div className="flex items-center gap-2 text-sm text-primary font-medium">
              <span className="bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                Total Interviews Attempted: {safeUserInterviews.filter(i => i.finalized).length}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button asChild className="btn-primary max-sm:w-full">
              <Link href="/interview">Browse All Categories</Link>
            </Button>
            <Button
              variant="outline"
              className="border-dark-400 text-gray-400 hover:text-white gap-2"
              onClick={async () => {
                const res = await seedChallenges();
                if (res.success) toast.success(res.message);
                else toast.info(res.message);
                window.location.reload();
              }}
            >
              <Database size={16} />
              Seed Data
            </Button>
          </div>
        </div>

        <Image
          src="/robot.png"
          alt="robo-dude"
          width={400}
          height={400}
          className="max-sm:hidden"
        />
      </section>

      {/* INTERVIEW OPTIONS */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Resume Based */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="text-primary" size={24} />
            <h2 className="text-2xl font-bold">Resume Based</h2>
          </div>
          <ResumeUpload userId={user?.id || ""} initialData={initialResumeData} />
        </div>

        {/* Role Based Grid */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Code2 className="text-primary" size={24} />
              <h2 className="text-2xl font-bold">Role Based Interviews</h2>
            </div>
            {challengeStats.completedCount > 0 && (
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full border border-primary/20 text-xs font-bold text-primary">
                <Trophy size={14} />
                {challengeStats.completedCount} Challenges Done
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RoleCard
              title="Coding Challenges"
              description="Practice real interview-style coding problems"
              icon={<Code size={24} />}
              userId={user.id}
              href="/dashboard/challenges"
              className="bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors"
              buttonText="Start Practice"
            />
            {predefinedRoles.map((role) => (
              <RoleCard
                key={role.role}
                role={role.role}
                userId={user?.id || ""}
                icon={role.icon}
              />
            ))}
          </div>
        </div>
      </section>

      {/* PAST INTERVIEWS */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2>Your Recent Interviews</h2>
          <Link href="/history" className="text-primary hover:underline">View All</Link>
        </div>

        <div className="interviews-section">
          {hasPastInterviews ? (
            safeUserInterviews.slice(0, 4).map((interview) => (
              <InterviewCard
                key={interview.id}
                userId={user?.id || ""}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
                difficulty={interview.difficulty || interview.level}
                duration={interview.duration}
                feedback={feedbacks[interview.id]}
              />
            ))
          ) : (
            <p className="text-gray-400 italic">You haven&apos;t taken any interviews yet</p>
          )}
        </div>
      </section>
    </main>
  );
}
