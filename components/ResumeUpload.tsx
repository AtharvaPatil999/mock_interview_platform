"use client";

import { useState } from "react";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase/client";
import { processResumeAction } from "@/lib/actions/resume.action";
import { toast } from "sonner";
import InterviewSetupModal from "./InterviewSetupModal";

const ResumeUpload = ({ userId }: { userId: string }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [resumeData, setResumeData] = useState<{
        text: string;
        summary: string;
    } | null>(null);
    const [isSetupOpen, setIsSetupOpen] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.type !== "application/pdf") {
                toast.error("Please upload a PDF file");
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file || !userId) return;

        setIsUploading(true);
        try {
            // 1. Upload to Firebase Storage
            const storageRef = ref(storage, `resumes/${userId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            // 2. Process File (Extract Text & Summarize)
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const result = await processResumeAction(buffer, userId);

            if (result.success) {
                setResumeData({
                    text: result.extractedText!,
                    summary: result.summary!,
                });
                toast.success("Resume processed successfully!");
                setIsSetupOpen(true);
            } else {
                toast.error(result.error || "Failed to process resume");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Error uploading resume");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="border-2 border-dashed border-dark-300 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 bg-dark-100/50 hover:bg-dark-100 transition-colors cursor-pointer relative">
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {file ? (
                    <div className="flex flex-col items-center gap-2">
                        <FileText className="text-primary size-12" />
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-gray-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                        <Upload className="text-gray-400 size-12" />
                        <p className="font-medium">Upload your Resume (PDF)</p>
                        <p className="text-sm text-gray-400">
                            Maximum file size: 5MB
                        </p>
                    </div>
                )}
            </div>

            <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="animate-spin size-4" />
                        Processing...
                    </>
                ) : resumeData ? (
                    <>
                        <CheckCircle2 className="size-4" />
                        Resume Ready
                    </>
                ) : (
                    "Process Resume"
                )}
            </button>

            {isSetupOpen && resumeData && (
                <InterviewSetupModal
                    isOpen={isSetupOpen}
                    onClose={() => setIsSetupOpen(false)}
                    type="resume"
                    userId={userId}
                    resumeData={resumeData}
                />
            )}
        </div>
    );
};

export default ResumeUpload;
