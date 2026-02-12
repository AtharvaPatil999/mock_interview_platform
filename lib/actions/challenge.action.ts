"use server";

import { db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { serializeFirestore } from "../utils";

import { exec } from "child_process";
import { promisify } from "util";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const execPromise = promisify(exec);

export async function getChallenges() {
    try {
        const snapshot = await db.collection("challenges").orderBy("createdAt", "desc").get();
        const challenges = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        return serializeFirestore(challenges) as Challenge[];
    } catch (error) {
        console.error("Error fetching challenges:", error);
        return [];
    }
}

export async function getChallengeById(id: string) {
    try {
        const doc = await db.collection("challenges").doc(id).get();
        if (!doc.exists) return null;
        return serializeFirestore({ id: doc.id, ...doc.data() }) as Challenge;
    } catch (error) {
        console.error("Error fetching challenge:", error);
        return null;
    }
}

export async function submitChallengeResult(params: {
    userId: string;
    challengeId: string;
    code: string;
    language: string;
    status: Submission["status"];
    passed: number;
    total: number;
    executionTimeMs: number;
    memoryUsedMB: number;
    details: Submission["details"];
}) {
    if (!params.userId) throw new Error("User not authenticated");

    try {
        const submission = {
            ...params,
            submittedAt: new Date().toISOString(),
        };
        const docRef = await db.collection("submissions").add(submission);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error submitting challenge:", error);
        return { success: false, error: "Failed to save submission" };
    }
}

export async function runCode(challengeId: string, code: string, language: string, isSubmit = false) {
    try {
        const challenge = await getChallengeById(challengeId);
        if (!challenge) return { error: "Challenge not found" };

        const allTests = isSubmit
            ? [...challenge.testCases.visible, ...challenge.testCases.hidden, ...challenge.testCases.edge]
            : challenge.testCases.visible;

        const results: Submission["details"] = [];
        let passed = 0;
        let totalTime = 0;
        let status: Submission["status"] = "Accepted";

        for (let i = 0; i < allTests.length; i++) {
            const testCase = allTests[i] as any;
            const type = i < challenge.testCases.visible.length ? "visible"
                : i < (challenge.testCases.visible.length + challenge.testCases.hidden.length) ? "hidden"
                    : "edge";

            const result = await executeSingleTest(code, language, testCase.input, testCase.expectedOutput, challenge.timeLimitMs);

            totalTime += result.time;
            results.push({
                type,
                category: testCase.category,
                passed: result.passed,
                expected: testCase.expectedOutput,
                received: result.actual,
                error: result.error || undefined
            });

            if (result.passed) {
                passed++;
            } else {
                if (result.error?.includes("Time Limit Exceeded")) status = "Time Limit Exceeded";
                else if (result.error) status = "Runtime Error";
                else status = "Wrong Answer";

                // On submisson, we continue to run all tests, but on "Run" we stop at first failure if needed? 
                // Hackerrank/Leetcode usually run all for submission.
            }
        }

        return {
            status,
            passed,
            total: allTests.length,
            details: results,
            executionTimeMs: totalTime,
            memoryUsedMB: Math.floor(Math.random() * 10) + 10, // Simulated memory for now
            error: null
        };
    } catch (error: any) {
        return { error: error.message, status: "Runtime Error" };
    }
}

async function executeSingleTest(userCode: string, language: string, input: any, expected: any, timeout: number) {
    const start = Date.now();
    let script = "";
    let command = "";
    const fileName = `test_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    try {
        if (language === "javascript") {
            const wrappedCode = userCode.includes("module.exports") ? userCode : `
                ${userCode}
                const input = ${JSON.stringify(input)};
                const result = typeof twoSum === 'function' ? twoSum(...input) : typeof isValid === 'function' ? isValid(...input) : null;
                console.log(JSON.stringify(result));
            `;
            const filePath = join(tmpdir(), `${fileName}.js`);
            writeFileSync(filePath, wrappedCode);
            command = `node ${filePath}`;

            const { stdout } = await execPromise(command, { timeout });
            const actual = JSON.parse(stdout.trim());
            unlinkSync(filePath);

            return {
                passed: deepCompare(actual, expected),
                actual,
                time: Date.now() - start
            };
        } else if (language === "python") {
            const wrappedCode = `
import json
import sys

${userCode}

input_data = ${JSON.stringify(input)}
solution = Solution()
try:
    if hasattr(solution, 'twoSum'):
        result = solution.twoSum(*input_data)
    elif hasattr(solution, 'isValid'):
        result = solution.isValid(*input_data)
    else:
        result = None
    print(json.dumps(result))
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
            `;
            const filePath = join(tmpdir(), `${fileName}.py`);
            writeFileSync(filePath, wrappedCode);
            command = `python ${filePath}`;

            const { stdout } = await execPromise(command, { timeout });
            const actual = JSON.parse(stdout.trim());
            unlinkSync(filePath);

            return {
                passed: deepCompare(actual, expected),
                actual,
                time: Date.now() - start
            };
        }
        return { passed: false, actual: null, time: 0, error: "Unsupported language" };
    } catch (error: any) {
        const elapsed = Date.now() - start;
        return {
            passed: false,
            actual: null,
            time: elapsed,
            error: elapsed >= timeout ? "Time Limit Exceeded" : error.message
        };
    }
}

function deepCompare(a: any, b: any): boolean {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        // For twoSum, the order of elements in the result might not matter
        // But for this strict upgrade, let's sort if it's an array of numbers
        const aSorted = [...a].sort();
        const bSorted = [...b].sort();
        return aSorted.every((val, index) => deepCompare(val, bSorted[index]));
    }

    if (typeof a === 'object' && a !== null && b !== null) {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every(key => deepCompare(a[key], b[key]));
    }

    // Float tolerance
    if (typeof a === 'number' && typeof b === 'number') {
        return Math.abs(a - b) < 0.00001;
    }

    return false;
}

export async function getChallengeStats(userId: string) {
    try {
        const snapshot = await db.collection("submissions")
            .where("userId", "==", userId)
            .where("status", "==", "Accepted")
            .get();

        const completedChallenges = new Set();
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            completedChallenges.add(data.challengeId);
        });

        return {
            completedCount: completedChallenges.size
        };
    } catch (error) {
        console.error("Error fetching challenge stats:", error);
        return { completedCount: 0 };
    }
}
