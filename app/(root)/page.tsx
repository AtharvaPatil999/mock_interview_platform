import Link from "next/link";
import Image from "next/image";
import { Code2, Database, Globe, TestTube, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import InterviewCard from "@/components/InterviewCard";
import ResumeUpload from "@/components/ResumeUpload";
import RoleCard from "@/components/RoleCard";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getInterviewsByUserId,
  getLatestInterviews,
} from "@/lib/actions/general.action";

import { dummyInterviews } from "@/constants";

async function Home() {
  const user = await getCurrentUser();

  const isDev = process.env.NODE_ENV === "development";

  const [userInterviews, allInterview] =
    isDev || !user
      ? [dummyInterviews, dummyInterviews]
      : await Promise.all([
        getInterviewsByUserId(user.id) || [],
        getLatestInterviews({ userId: user.id }) || [],
      ]);

  const safeUserInterviews = userInterviews || [];
  const safeAllInterview = allInterview || [];

  const hasPastInterviews = safeUserInterviews.length > 0;

  const predefinedRoles = [
    { role: "Java Developer", icon: <Code2 size={24} /> },
    { role: "Python Developer", icon: <Database size={24} /> },
    { role: "Golang Developer", icon: <Globe size={24} /> },
    { role: "Software Tester", icon: <TestTube size={24} /> },
  ];

  return (
    <div className="flex flex-col gap-10">
      {/* CTA SECTION */}
      <section className="card-cta">
        <div className="flex flex-col gap-6 max-w-lg">
          <h2>
            Get Interview-Ready with AI-Powered Practice & Feedback via PrepWise
          </h2>

          <p className="text-lg">
            Practice real interview questions & get instant feedback
          </p>

          <Button asChild className="btn-primary max-sm:w-full">
            <Link href="/interview">Browse All Categories</Link>
          </Button>
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
          <ResumeUpload userId={user?.id || ""} />
        </div>

        {/* Role Based Grid */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-2">
            <Code2 className="text-primary" size={24} />
            <h2 className="text-2xl font-bold">Role Based Interviews</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                userId={user?.id}
                interviewId={interview.id}
                role={interview.role}
                type={interview.type}
                techstack={interview.techstack}
                createdAt={interview.createdAt}
              />
            ))
          ) : (
            <p className="text-gray-400 italic">You haven&apos;t taken any interviews yet</p>
          )}
        </div>
      </section>
    </div>
  );
}


export default Home;
