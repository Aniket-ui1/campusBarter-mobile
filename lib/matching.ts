// lib/matching.ts
// ─────────────────────────────────────────────────────────────────
// Smart matching: find students whose skills complement yours.
// Scores users by how many of their skills match your weaknesses
// (and vice versa), then returns the top matches.
// ─────────────────────────────────────────────────────────────────

import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export interface MatchedUser {
    id: string;
    displayName: string;
    avatarUrl?: string;
    program?: string;
    semester?: number;
    rating?: number;
    /** Skills they have that you need */
    matchingSkills: string[];
    /** Weaknesses they have that you can help with */
    theyNeed: string[];
    /** 0–100 match score */
    score: number;
}

/**
 * Fetch all users from Firestore and rank them by how well their
 * skills/weaknesses complement the current user's profile.
 *
 * Scoring:
 *  +3 for each of their skills that matches one of your weaknesses
 *  +2 for each of your skills that matches one of their weaknesses
 *  +1 for shared interests
 */
export async function getRecommendedUsers(
    currentUserId: string,
    mySkills: string[],
    myWeaknesses: string[],
    myInterests: string[],
    limit = 10
): Promise<MatchedUser[]> {
    const snap = await getDocs(collection(db, "users"));
    const matches: MatchedUser[] = [];

    snap.forEach((doc) => {
        if (doc.id === currentUserId) return; // skip self

        const data = doc.data();
        const theirSkills: string[] = data.skills ?? [];
        const theirWeaknesses: string[] = data.weaknesses ?? [];
        const theirInterests: string[] = data.interests ?? [];

        // Their skills that match my weaknesses → they can help me
        const matchingSkills = theirSkills.filter((s) =>
            myWeaknesses.map((w) => w.toLowerCase()).includes(s.toLowerCase())
        );

        // My skills that match their weaknesses → I can help them
        const theyNeed = mySkills.filter((s) =>
            theirWeaknesses.map((w) => w.toLowerCase()).includes(s.toLowerCase())
        );

        // Shared interests
        const sharedInterests = theirInterests.filter((s) =>
            myInterests.map((i) => i.toLowerCase()).includes(s.toLowerCase())
        );

        const rawScore =
            matchingSkills.length * 3 +
            theyNeed.length * 2 +
            sharedInterests.length * 1;

        if (rawScore === 0) return; // no match at all

        // Normalize to 0–100
        const maxPossible = (myWeaknesses.length * 3) + (mySkills.length * 2) + (myInterests.length * 1);
        const score = maxPossible > 0 ? Math.round((rawScore / maxPossible) * 100) : 0;

        matches.push({
            id: doc.id,
            displayName: data.displayName ?? "Student",
            avatarUrl: data.avatarUrl,
            program: data.program,
            semester: data.semester,
            rating: data.rating,
            matchingSkills,
            theyNeed,
            score,
        });
    });

    // Sort by score descending, take top N
    return matches.sort((a, b) => b.score - a.score).slice(0, limit);
}
