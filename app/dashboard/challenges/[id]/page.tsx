"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ChevronLeft,
    Play,
    Send,
    Code2,
    Info,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Terminal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getChallengeById, runCode, submitChallengeResult } from "@/lib/actions/challenge.action";
import { useUser } from "@/components/UserProvider";
import { use } from "react";

export default function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const user = useUser();
    const [challenge, setChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [code, setCode] = useState("");
    const [language, setLanguage] = useState("javascript");
    const [output, setOutput] = useState<any>(null);
    const [running, setRunning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<"description" | "examples">("description");

    useEffect(() => {
        async function fetchChallenge() {
            const data = await getChallengeById(id);
            if (data) {
                setChallenge(data);
                setCode((data.starterCode as any)[language] || "");
            }
            setLoading(false);
        }
        fetchChallenge();
    }, [id, language]);

    const handleRun = async () => {
        setRunning(true);
        const result = await runCode(id, code, language);
        setOutput(result);
        setRunning(false);
    };

    const handleSubmit = async () => {
        if (!user) return;
        setSubmitting(true);
        const result: any = await runCode(id, code, language, true);
        setOutput(result);

        if (!result.error) {
            await submitChallengeResult({
                userId: user.id,
                challengeId: id,
                code,
                language,
                status: result.status,
                passed: result.passed,
                total: result.total,
                executionTimeMs: result.executionTimeMs,
                memoryUsedMB: result.memoryUsedMB,
                details: result.details
            });
        }

        setSubmitting(false);
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!challenge) {
        return (
            <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
                <AlertCircle size={48} className="text-red-500" />
                <h2 className="text-2xl font-bold">Challenge Not Found</h2>
                <Button asChild variant="outline">
                    <Link href="/dashboard/challenges">Back to Challenges</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            <div className="p-4 border-b border-dark-300 flex items-center justify-between bg-dark-200">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/challenges" className="p-2 hover:bg-dark-300 rounded-lg transition-colors">
                        <ChevronLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-white">{challenge.title}</h1>
                        <div className="flex items-center gap-2 text-xs">
                            <span className={`font-bold ${challenge.difficulty === 'Easy' ? 'text-green-500' :
                                challenge.difficulty === 'Medium' ? 'text-yellow-500' : 'text-red-500'
                                }`}>{challenge.difficulty}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-400">{challenge.tags.join(", ")}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-dark-300 border border-dark-400 text-white text-sm rounded-lg px-3 py-1.5 outline-none"
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                    </select>
                    <Button
                        onClick={handleRun}
                        disabled={running || submitting}
                        variant="outline"
                        className="border-dark-400 hover:bg-dark-300 gap-2"
                    >
                        {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        Run
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={running || submitting}
                        className="btn-primary gap-2"
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Submit
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Description */}
                <div className="w-1/2 border-r border-dark-300 flex flex-col bg-dark-100 overflow-y-auto">
                    <div className="flex p-2 gap-2 border-b border-dark-300 sticky top-0 bg-dark-100 z-10">
                        <button
                            onClick={() => setActiveTab("description")}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'description' ? 'bg-dark-300 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Description
                        </button>
                        <button
                            onClick={() => setActiveTab("examples")}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'examples' ? 'bg-dark-300 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Examples
                        </button>
                    </div>

                    <div className="p-6 prose prose-invert max-w-none">
                        {activeTab === "description" ? (
                            <div className="flex flex-col gap-6">
                                <div>
                                    <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                                        <Info size={18} className="text-primary" /> Problem Description
                                    </h3>
                                    <p className="text-gray-300 leading-relaxed">{challenge.description}</p>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold mb-2">Constraints</h3>
                                    <ul className="list-disc pl-5 text-gray-400 space-y-1">
                                        {challenge.constraints.map((c, i) => (
                                            <li key={i}>{c}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                {challenge.examples.map((ex, i) => (
                                    <div key={i} className="bg-dark-200 border border-dark-300 rounded-xl p-4">
                                        <h4 className="text-primary font-bold mb-3 text-sm uppercase tracking-wider">Example {i + 1}</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <span className="text-xs text-gray-500 font-bold uppercase block mb-1">Input</span>
                                                <code className="bg-dark-300 px-3 py-2 rounded-lg block text-gray-300 border border-dark-400 font-mono text-sm">{ex.input}</code>
                                            </div>
                                            <div>
                                                <span className="text-xs text-gray-500 font-bold uppercase block mb-1">Output</span>
                                                <code className="bg-dark-300 px-3 py-2 rounded-lg block text-gray-300 border border-dark-400 font-mono text-sm">{ex.output}</code>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Editor & Console */}
                <div className="w-1/2 flex flex-col bg-dark-200">
                    <div className="flex-1 p-0 relative group">
                        <div className="absolute inset-0 bg-dark-300/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        <textarea
                            className="w-full h-full bg-[#1e1e1e] text-gray-300 p-6 font-mono text-sm outline-none resize-none spellcheck-false"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="// Write your solution here..."
                        />
                        <div className="absolute top-4 right-4 text-[10px] text-gray-600 font-mono uppercase tracking-widest bg-dark-300/50 px-2 py-1 rounded backdrop-blur-sm border border-white/5">
                            Code Editor
                        </div>
                    </div>

                    {/* Console Output */}
                    <div className="h-1/3 border-t border-dark-300 flex flex-col bg-[#141414]">
                        <div className="flex items-center gap-2 px-4 py-2 border-b border-dark-300/50 bg-[#1a1a1a]">
                            <Terminal size={14} className="text-gray-500" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Console Output</span>
                        </div>
                        <div className="flex-1 p-4 font-mono text-sm overflow-y-auto">
                            {!output && <p className="text-gray-600 italic">Run your code to see output...</p>}
                            {output && (
                                <div className="flex flex-col gap-3">
                                    {output.error ? (
                                        <div className="text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                                            <p className="font-bold flex items-center gap-2 mb-1 text-xs uppercase"><AlertCircle size={14} /> Error</p>
                                            {output.error}
                                        </div>
                                    ) : (
                                        <>
                                            <div className={`p-4 rounded-xl border flex flex-col gap-3 ${output.status === "Accepted" ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-400'
                                                }`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {output.status === "Accepted" ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                                                        <div>
                                                            <p className="font-bold text-lg">{output.status}</p>
                                                            <p className="text-xs opacity-70">{output.passed} / {output.total} Tests Passed</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end text-xs font-mono opacity-80">
                                                        <span>Time: {output.executionTimeMs}ms</span>
                                                        <span>Memory: {output.memoryUsedMB}MB</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {output.details && (
                                                <div className="space-y-2 mt-2">
                                                    {output.details.map((res: any, i: number) => (
                                                        <div key={i} className="group flex flex-col rounded-lg bg-dark-300/50 border border-dark-400/50 overflow-hidden">
                                                            <div className="flex items-center justify-between p-2 cursor-pointer hover:bg-dark-300/80 transition-colors">
                                                                <div className="flex items-center gap-2 text-xs">
                                                                    {res.passed ? <div className="size-2 rounded-full bg-green-500" /> : <div className="size-2 rounded-full bg-red-500" />}
                                                                    <span className="text-gray-400 font-bold uppercase">{res.type} Case {i + 1}</span>
                                                                    {res.category && <span className="text-[10px] bg-dark-400 px-1 rounded text-gray-500">{res.category}</span>}
                                                                </div>
                                                                <span className={res.passed ? 'text-green-500 text-[10px]' : 'text-red-400 text-[10px]'}>
                                                                    {res.passed ? 'PASSED' : 'FAILED'}
                                                                </span>
                                                            </div>
                                                            {!res.passed && (
                                                                <div className="p-3 border-t border-dark-400/50 bg-dark-400/20 space-y-2 font-mono text-[11px]">
                                                                    {res.error ? (
                                                                        <p className="text-red-400/80">{res.error}</p>
                                                                    ) : (
                                                                        <>
                                                                            <div>
                                                                                <span className="text-gray-500 block mb-1">Expected:</span>
                                                                                <code className="text-green-500/80 bg-dark-500/50 px-2 py-1 rounded block">{JSON.stringify(res.expected)}</code>
                                                                            </div>
                                                                            <div>
                                                                                <span className="text-gray-500 block mb-1">Received:</span>
                                                                                <code className="text-red-400/80 bg-dark-500/50 px-2 py-1 rounded block">{JSON.stringify(res.received)}</code>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
