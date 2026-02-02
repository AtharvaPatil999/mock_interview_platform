"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import InterviewSetupModal from "./InterviewSetupModal";

interface RoleCardProps {
    role: string;
    userId: string;
    icon?: React.ReactNode;
}

const RoleCard = ({ role, userId, icon }: RoleCardProps) => {
    const [isSetupOpen, setIsSetupOpen] = useState(false);

    return (
        <>
            <div
                onClick={() => setIsSetupOpen(true)}
                className="group bg-dark-200 border border-dark-300 rounded-2xl p-6 flex flex-col gap-4 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    {icon}
                </div>

                <div className="bg-primary/10 w-fit p-3 rounded-xl text-primary">
                    {icon}
                </div>

                <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-semibold capitalize">{role}</h3>
                    <p className="text-sm text-gray-400">Predefined role-based interview</p>
                </div>

                <div className="flex items-center text-primary font-medium mt-2">
                    Start Session <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </div>
            </div>

            {isSetupOpen && (
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
