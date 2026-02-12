import admin from "firebase-admin";

if (!admin.apps.length) {
    const {
        FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY,
    } = process.env;

    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
        throw new Error("Missing Firebase Admin environment variables");
    }

    const formattedKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

    if (!formattedKey.includes("BEGIN PRIVATE KEY")) {
        throw new Error("Invalid Firebase private key format");
    }

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: formattedKey,
        }),
    });

    console.log("[FIREBASE_ADMIN] Initialized successfully");
}

const db = admin.firestore();
const auth = admin.auth();

export { admin as default, db, auth };
