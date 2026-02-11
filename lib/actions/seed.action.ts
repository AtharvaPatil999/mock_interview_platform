"use server";

import { db } from "@/firebase/admin";

export async function seedChallenges() {
    const challenges = [
        {
            title: "Two Sum",
            difficulty: "Easy",
            description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
            examples: [
                { input: "nums = [2,7,11,15], target = 9", output: "[0,1]" },
                { input: "nums = [3,2,4], target = 6", output: "[1,2]" }
            ],
            constraints: [
                "2 <= nums.length <= 10^4",
                "-10^9 <= nums[i] <= 10^9",
                "-10^9 <= target <= 10^9"
            ],
            starterCode: {
                javascript: "function twoSum(nums, target) {\n  // Your code here\n}",
                python: "def two_sum(nums, target):\n    # Your code here"
            },
            testCases: [
                { input: "[2,7,11,15], 9", output: "[0,1]" },
                { input: "[3,2,4], 6", output: "[1,2]" }
            ],
            tags: ["Arrays", "Hash Table"],
            estimatedTime: "15 mins",
            createdAt: new Date().toISOString()
        },
        {
            title: "Valid Parentheses",
            difficulty: "Easy",
            description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
            examples: [
                { input: "s = '()'", output: "true" },
                { input: "s = '()[]{}'", output: "true" }
            ],
            constraints: [
                "1 <= s.length <= 10^4",
                "s consists of parentheses only"
            ],
            starterCode: {
                javascript: "function isValid(s) {\n  // Your code here\n}",
                python: "def is_valid(s):\n    # Your code here"
            },
            testCases: [
                { input: "'()'", output: "true" },
                { input: "'()[]{}'", output: "true" }
            ],
            tags: ["String", "Stack"],
            estimatedTime: "10 mins",
            createdAt: new Date().toISOString()
        }
    ];

    try {
        const batch = db.batch();
        const collection = db.collection("challenges");

        // Check if seeded already
        const snapshot = await collection.limit(1).get();
        if (!snapshot.empty) return { message: "Already seeded" };

        challenges.forEach((c) => {
            const ref = collection.doc();
            batch.set(ref, c);
        });

        await batch.commit();
        return { success: true, message: "Seeded successfully" };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
