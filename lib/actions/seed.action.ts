"use server";

import { db } from "@/lib/firebase-admin";

export async function seedChallenges() {
    const challenges: Partial<Challenge>[] = [
        {
            title: "Two Sum",
            difficulty: "Easy",
            description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
            examples: [
                {
                    input: "nums = [2,7,11,15], target = 9",
                    output: "[0,1]",
                    explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
                },
                {
                    input: "nums = [3,2,4], target = 6",
                    output: "[1,2]"
                }
            ],
            constraints: [
                "2 <= nums.length <= 10^4",
                "-10^9 <= nums[i] <= 10^9",
                "-10^9 <= target <= 10^9",
                "Only one valid answer exists."
            ],
            starterCode: {
                javascript: "/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar twoSum = function(nums, target) {\n    \n};",
                python: "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        "
            },
            testCases: {
                visible: [
                    { input: [[2, 7, 11, 15], 9], expectedOutput: [0, 1] },
                    { input: [[3, 2, 4], 6], expectedOutput: [1, 2] },
                    { input: [[3, 3], 6], expectedOutput: [0, 1] }
                ],
                hidden: [
                    { input: [[1, 5, 5, 9], 10], expectedOutput: [1, 2] },
                    { input: [[0, 4, 3, 0], 0], expectedOutput: [0, 3] },
                    { input: [[-1, -2, -3, -4, -5], -8], expectedOutput: [2, 4] },
                    { input: [[10, 20, 30, 40], 50], expectedOutput: [0, 3] },
                    { input: [[100, 200, 300], 500], expectedOutput: [1, 2] }
                ],
                edge: [
                    { input: [[2, 7], 9], expectedOutput: [0, 1], category: "boundary" },
                    { input: [[10 ** 9, 1, 10 ** 9], 2 * 10 ** 9], expectedOutput: [0, 2], category: "large_input" },
                    { input: [[-(10 ** 9), 10 ** 9], 0], expectedOutput: [0, 1], category: "negative" },
                    { input: [[0, 0], 0], expectedOutput: [0, 1], category: "empty" },
                    { input: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 19], expectedOutput: [8, 9], category: "sorted" }
                ]
            },
            timeLimitMs: 2000,
            memoryLimitMB: 128,
            tags: ["Arrays", "Hash Table"],
            estimatedTime: "15 mins",
            createdAt: new Date().toISOString()
        },
        {
            title: "Valid Parentheses",
            difficulty: "Easy",
            description: "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if open brackets are closed by the same type of brackets, and are closed in the correct order.",
            examples: [
                { input: "s = '()'", output: "true" },
                { input: "s = '()[]{}'", output: "true" },
                { input: "s = '(]'", output: "false" }
            ],
            constraints: [
                "1 <= s.length <= 10^4",
                "s consists of parentheses only '()[]{}'."
            ],
            starterCode: {
                javascript: "/**\n * @param {string} s\n * @return {boolean}\n */\nvar isValid = function(s) {\n    \n};",
                python: "class Solution:\n    def isValid(self, s: str) -> bool:\n        "
            },
            testCases: {
                visible: [
                    { input: ["()"], expectedOutput: true },
                    { input: ["()[]{}"], expectedOutput: true },
                    { input: ["(]"], expectedOutput: false }
                ],
                hidden: [
                    { input: ["([{}])"], expectedOutput: true },
                    { input: ["("], expectedOutput: false },
                    { input: [")"], expectedOutput: false },
                    { input: ["((("], expectedOutput: false },
                    { input: ["){"], expectedOutput: false }
                ],
                edge: [
                    { input: ["()".repeat(5000)], expectedOutput: true, category: "large_input" },
                    { input: ["["], expectedOutput: false, category: "boundary" },
                    { input: [""], expectedOutput: false, category: "empty" },
                    { input: ["(((())))"], expectedOutput: true, category: "sorted" },
                    { input: ["[[[]]]"], expectedOutput: true, category: "duplicate" }
                ]
            },
            timeLimitMs: 1000,
            memoryLimitMB: 64,
            tags: ["String", "Stack"],
            estimatedTime: "10 mins",
            createdAt: new Date().toISOString()
        }
    ];

    try {
        const batch = db.batch();
        const collection = db.collection("challenges");

        // Check if seeded already (optional: clear or skip)
        // For this upgrade, we might want to clear old ones or just add new ones
        // Let's clear for a clean professional set
        const oldDocs = await collection.get();
        oldDocs.forEach(doc => batch.delete(doc.ref));

        challenges.forEach((c) => {
            const ref = collection.doc();
            batch.set(ref, c);
        });

        await batch.commit();
        return { success: true, message: "Professional challenges seeded successfully" };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
