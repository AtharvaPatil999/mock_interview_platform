"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Search, Filter, Code2, Clock, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getChallenges } from "@/lib/actions/challenge.action";
import { Loader2 } from "lucide-react";

export default function ChallengesPage() {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("All");

    useEffect(() => {
        async function fetchChallenges() {
            const data = await getChallenges();
            setChallenges(data);
            setLoading(false);
        }
        fetchChallenges();
    }, []);

    const filteredChallenges = filter === "All"
        ? challenges
        : challenges.filter(c => c.difficulty === filter);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto">
            <div className="flex flex-col gap-4">
                <Link href="/" className="flex items-center gap-2 text-primary hover:underline w-fit">
                    <ChevronLeft size={20} />
                    Back to Dashboard
                </Link>
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-bold text-white leading-tight">Coding Practice</h1>
                    <p className="text-gray-400 text-lg">Hone your coding skills with real-world interview problems.</p>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-dark-200 p-4 rounded-2xl border border-dark-300">
                <div className="flex items-center gap-2 bg-dark-300 px-4 py-2 rounded-xl border border-dark-400 flex-1">
                    <Search size={20} className="text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search challenges..."
                        className="bg-transparent border-none outline-none text-white w-full"
                    />
                </div>
                <div className="flex items-center gap-2">
                    {["All", "Easy", "Medium", "Hard"].map((lvl) => (
                        <button
                            key={lvl}
                            onClick={() => setFilter(lvl)}
                            className={`px-4 py-2 rounded-xl border transition-all ${filter === lvl
                                    ? "bg-primary border-primary text-white"
                                    : "bg-dark-300 border-dark-400 text-gray-400 hover:border-primary/50"
                                }`}
                        >
                            {lvl}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredChallenges.length > 0 ? (
                    filteredChallenges.map((challenge) => (
                        <div key={challenge.id} className="group bg-dark-200 border border-dark-300 rounded-3xl p-6 flex flex-col gap-6 hover:border-primary transition-all relative overflow-hidden">
                            <div className="flex justify-between items-start">
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${challenge.difficulty === 'Easy' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                        challenge.difficulty === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                                            'bg-red-500/10 border-red-500/20 text-red-500'
                                    }`}>
                                    {challenge.difficulty}
                                </div>
                                <div className="flex items-center gap-1 text-gray-500 text-sm">
                                    <Clock size={14} />
                                    {challenge.estimatedTime || "20 mins"}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{challenge.title}</h3>
                                <p className="text-sm text-gray-400 line-clamp-2">{challenge.description}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {challenge.tags.map(tag => (
                                    <span key={tag} className="text-[10px] uppercase font-bold tracking-wider bg-dark-300 text-gray-500 px-2 py-1 rounded-md border border-dark-400">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <Button asChild className="btn-primary w-full mt-2">
                                <Link href={`/dashboard/challenges/${challenge.id}`}>Solve Challenge</Link>
                            </Button>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center p-20 bg-dark-200 rounded-3xl border border-dashed border-dark-400">
                        <Code2 size={48} className="text-gray-600 mb-4" />
                        <p className="text-gray-500">No challenges found matching your criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
