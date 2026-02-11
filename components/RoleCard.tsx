"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import InterviewSetupModal from "./InterviewSetupModal";

interface RoleCardProps {
    role?: string;
    userId: string;
    icon?: React.ReactNode;
    title?: string;
    description?: string;
    href?: string;
    buttonText?: string;
    className?: string;
}

const RoleCard = ({
    role,
    userId,
    icon,
    title,
    description,
    href,
    buttonText = "Start Session",
    className
}: RoleCardProps) => {
    const [isSetupOpen, setIsSetupOpen] = useState(false);

    const handleClick = () => {
        if (href) {
            window.location.href = href;
        } else {
            setIsSetupOpen(true);
        }
    };

    return (
        <>
            <div
                onClick={handleClick}
                className={`group bg-dark-200 border border-dark-300 rounded-2xl p-6 flex flex-col gap-4 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden ${className || ""}`}
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    {icon}
                </div>

                <div className="bg-primary/10 w-fit p-3 rounded-xl text-primary">
                    {icon}
                </div>

                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-semibold capitalize">{title || role}</h3>
                    <p className="text-sm text-gray-400">{description || "Predefined role-based interview"}</p>
                </div>

                <div className="flex items-center text-primary font-medium mt-2">
                    {buttonText} <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
            </div>

            {isSetupOpen && role && (
                <InterviewSetupModal
                    isOpen={isSetupOpen}
                    onClose={() => setIsSetupOpen(false)}
                    type="role"
                    userId={userId}
                    role={role}
                />
            )}
        </>
    );
};

export default RoleCard;
