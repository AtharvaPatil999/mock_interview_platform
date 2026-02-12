"use server";

import { db, auth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { serializeFirestore } from "../utils";

// Session duration (1 week)
const SESSION_DURATION = 60 * 60 * 24 * 7;

// Set session cookie
export async function setSessionCookie(idToken: string) {
  const cookieStore = await cookies();

  // Create session cookie
  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: SESSION_DURATION * 1000, // milliseconds
  });

  // Set cookie in the browser
  cookieStore.set("session", sessionCookie, {
    maxAge: SESSION_DURATION,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });
}

export async function signUp(params: SignUpParams) {
  const { uid, name, email } = params;

  try {
    // check if user exists in db
    const userRecord = await db.collection("users").doc(uid).get();
    if (userRecord.exists)
      return {
        success: false,
        message: "User already exists. Please sign in.",
      };

    // save user to db
    await db.collection("users").doc(uid).set({
      name,
      email,
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      message: "Account created successfully. Please sign in.",
    };
  } catch (error: any) {
    console.error("Error creating user:", error);

    // Handle Firebase specific errors
    if (error.code === "auth/email-already-exists") {
      return {
        success: false,
        message: "This email is already in use",
      };
    }

    return {
      success: false,
      message: "Failed to create account. Please try again.",
    };
  }
}

export async function signIn(params: SignInParams) {
  const { email, idToken } = params;
  try {
    console.log(`[AUTH_ACTION] SignIn attempt - Email: ${email}`);

    if (!idToken) {
      console.error("[AUTH_ACTION] SignIn Error: Missing idToken");
      return { success: false, message: "Authentication failed: Missing token." };
    }

    // Verify the ID token to ensure it's valid and get the UID
    console.log("[AUTH_ACTION] Verifying ID token...");
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    console.log(`[AUTH_ACTION] Token verified - UID: ${uid}`);

    if (decodedToken.email !== email) {
      console.warn(`[AUTH_ACTION] Email mismatch: Token(${decodedToken.email}) vs Params(${email})`);
    }

    // Check if user exists in Firestore
    console.log(`[AUTH_ACTION] Checking Firestore for UID: ${uid}`);
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      console.error(`[AUTH_ACTION] Firestore Error: User document not found for UID: ${uid}`);
      return {
        success: false,
        message: "Account record not found. Please sign up again.",
      };
    }

    console.log("[AUTH_ACTION] Creating session cookie...");
    await setSessionCookie(idToken);
    console.log("[AUTH_ACTION] Session cookie set successfully");

    return {
      success: true,
      message: "Signed in successfully.",
    };
  } catch (error: any) {
    console.error("[AUTH_ACTION] SignIn CRITICAL ERROR:", {
      code: error.code,
      message: error.message,
      stack: error.stack
    });

    let errorMessage = "Failed to log into account. Please try again.";
    if (error.code === 'auth/id-token-expired') {
      errorMessage = "Your session has expired. Please sign in again.";
    } else if (error.code === 'auth/argument-error') {
      errorMessage = "Invalid authentication credentials.";
    } else if (error.code === 'auth/user-disabled') {
      errorMessage = "This account has been disabled.";
    }

    return {
      success: false,
      message: error.message || errorMessage,
    };
  }
}

// Sign out user by clearing the session cookie
export async function signOut() {
  const cookieStore = await cookies();

  cookieStore.delete("session");
}

// Get current user from session cookie
export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();

  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    const uid = decodedClaims.uid;

    // get user info from db
    const userRecord = await db
      .collection("users")
      .doc(uid)
      .get();

    if (!userRecord.exists) {
      console.warn(`[AUTH_ACTION] getCurrentUser: User document not found for UID: ${uid}`);
      return null;
    }

    return serializeFirestore({
      ...userRecord.data(),
      id: userRecord.id,
    }) as User;
  } catch (error: any) {
    if (error.code === 'auth/session-cookie-expired') {
      console.log("[AUTH_ACTION] Session cookie expired");
    } else if (error.code === 'auth/user-not-found') {
      console.warn("[AUTH_ACTION] User not found during session verification");
    } else {
      console.error("[AUTH_ACTION] Error getting current user:", error.message);
    }

    // Invalid or expired session
    return null;
  }
}

// Check if user is authenticated
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}
