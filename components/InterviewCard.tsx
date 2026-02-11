"use client";

import dayjs from "dayjs";
import Link from "next/link";
import Image from "next/image";

import { Button } from "./ui/button";
import DisplayTechIcons from "./DisplayTechIcons";

import { cn, getInterviewCover } from "@/lib/utils";

const InterviewCard = ({
  interviewId,
  userId,
  role,
  type,
  techstack,
  createdAt,
  difficulty,
  duration,
  feedback,
}: InterviewCardProps) => {
  const normalizedType = /mix/gi.test(type) ? "Mixed" : type;

  const badgeColor =
    {
      Behavioral: "bg-light-400",
      Mixed: "bg-light-600",
      Technical: "bg-light-800",
    }[normalizedType] || "bg-light-600";

  const formattedDate = dayjs(feedback?.createdAt || createdAt).format(
    "MMM D, YYYY"
  );

  return (
    <div className="card-border w-[360px] max-sm:w-full min-h-96 text-white">
      <div className="card-interview relative">
        <div>
          {/* Type Badge */}
          <div
            className={cn(
              "absolute top-0 right-0 w-fit px-4 py-2 rounded-bl-lg",
              badgeColor
            )}
          >
            <p className="badge-text ">{normalizedType}</p>
          </div>

          {/* Cover Image */}
          <Image
            src={getInterviewCover(interviewId)}
            alt="cover-image"
            width={90}
            height={90}
            className="rounded-full object-fit size-[90px]"
          />

          {/* Interview Role */}
          <h3 className="mt-5 capitalize">{role} Interview</h3>

          {/* Date & Score */}
          <div className="flex flex-row gap-5 mt-3">
            <div className="flex flex-row gap-2 text-white/70">
              <Image
                src="/calendar.svg"
                width={22}
                height={22}
                alt="calendar"
              />
              <p suppressHydrationWarning>{formattedDate}</p>
            </div>

            <div className="flex flex-row gap-2 items-center text-white/70">
              <Image src="/star.svg" width={22} height={22} alt="star" />
              <p>{feedback?.totalScore !== undefined ? `${feedback.totalScore}/100` : "---/100"}</p>
            </div>
          </div>

          {/* Difficulty & Duration */}
          <div className="flex flex-row gap-5 mt-2 text-sm text-gray-400">
            {difficulty && (
              <div className="flex items-center gap-1">
                <span className="font-semibold text-primary/80">Level:</span> {difficulty}
              </div>
            )}
            {duration && (
              <div className="flex items-center gap-1">
                <span className="font-semibold text-primary/80">Time:</span> {duration}m
              </div>
            )}
          </div>

          {/* Feedback or Placeholder Text */}
          <p className="line-clamp-2 mt-5 text-gray-300">
            {feedback?.finalAssessment ||
              "You haven't taken this interview yet. Take it now to improve your skills."}
          </p>
        </div>

        <div className="flex flex-row justify-between mt-auto pt-4">
          <DisplayTechIcons techStack={techstack} />

          <Button asChild className="btn-primary">
            <Link
              href={
                feedback
                  ? `/interview/${interviewId}/feedback`
                  : `/interview/${interviewId}`
              }
            >
              {feedback ? "Check Feedback" : "View Interview"}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InterviewCard;
