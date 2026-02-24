// lib/firestore.ts
// ─────────────────────────────────────────────────────────────────
// Typed Firestore helpers for CampusBarter.
// All reads/writes go through here — keeps screens clean.
// ─────────────────────────────────────────────────────────────────

import {
    addDoc,
    collection,
    doc,
    DocumentData,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    updateDoc,
    where,
} from "firebase/firestore";
import { db } from "./firebase";

// ── Types ────────────────────────────────────────────────────────

export interface FSListing {
    id: string;
    type: "OFFER" | "REQUEST";
    title: string;
    description: string;
    credits: number;
    userId: string;
    userName: string;
    createdAt: string;
    status: "OPEN" | "CLOSED";
}

export interface FSMessage {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
}

export interface FSChat {
    id: string;
    listingId: string;
    listingTitle: string;
    participants: string[];
    lastMessageAt: string;
}

// ── Listings ─────────────────────────────────────────────────────

/**
 * Subscribe to all OPEN listings, sorted newest-first.
 * Returns an unsubscribe function — call it in useEffect cleanup.
 *
 * Usage:
 *   useEffect(() => {
 *     return subscribeToListings((data) => setListings(data));
 *   }, []);
 */
export function subscribeToListings(cb: (listings: FSListing[]) => void) {
    const q = query(
        collection(db, "listings"),
        where("status", "==", "OPEN")
    );
    return onSnapshot(q, (snap) => {
        const listings = snap.docs
            .map((d) => ({
                id: d.id,
                ...(d.data() as Omit<FSListing, "id">),
            }))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // newest first
        cb(listings);
    });
}

/**
 * Create a new listing document.
 * Returns the new listing's Firestore document ID.
 */
export async function createListing(
    data: Omit<FSListing, "id" | "createdAt" | "status">
): Promise<string> {
    const ref = await addDoc(collection(db, "listings"), {
        ...data,
        status: "OPEN",
        createdAt: new Date().toISOString(),
    });
    return ref.id;
}

/**
 * Close a listing (marks it as CLOSED so it disappears from the feed).
 */
export async function closeListing(listingId: string): Promise<void> {
    await updateDoc(doc(db, "listings", listingId), { status: "CLOSED" });
}

// ── Chats ─────────────────────────────────────────────────────────

/**
 * Subscribe to all chats that the given userId is a participant in.
 * Sorted by most-recently-updated first.
 */
export function subscribeToChats(
    userId: string,
    cb: (chats: FSChat[]) => void
) {
    const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", userId)
    );
    return onSnapshot(q, (snap) => {
        const chats = snap.docs
            .map((d) => ({
                id: d.id,
                ...(d.data() as Omit<FSChat, "id">),
            }))
            .sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || '')); // newest first
        cb(chats);
    });
}

/**
 * Start a new chat (or return the existing chat ID if one already exists
 * for the same listing + participants).
 */
export async function startChat(
    listingId: string,
    listingTitle: string,
    participantIds: string[]
): Promise<string> {
    // Check for an existing chat
    const q = query(
        collection(db, "chats"),
        where("listingId", "==", listingId),
        where("participants", "array-contains", participantIds[0])
    );
    const existing = await new Promise<string | null>((resolve) => {
        const unsub = onSnapshot(q, (snap) => {
            unsub();
            const found = snap.docs.find((d) =>
                participantIds.every((id) =>
                    (d.data().participants as string[]).includes(id)
                )
            );
            resolve(found ? found.id : null);
        });
    });

    if (existing) return existing;

    const ref = await addDoc(collection(db, "chats"), {
        listingId,
        listingTitle,
        participants: participantIds,
        lastMessageAt: new Date().toISOString(),
    });
    return ref.id;
}

// ── Messages ──────────────────────────────────────────────────────

/**
 * Subscribe to all messages in a chat, sorted oldest-first.
 */
export function subscribeToMessages(
    chatId: string,
    cb: (messages: FSMessage[]) => void
) {
    const q = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("timestamp", "asc")
    );
    return onSnapshot(q, (snap) => {
        cb(
            snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<FSMessage, "id">),
            }))
        );
    });
}

/**
 * Send a message to a chat.
 * Also updates the chat's `lastMessageAt` so the chat list stays sorted.
 */
export async function sendMessage(
    chatId: string,
    senderId: string,
    text: string
): Promise<void> {
    const now = new Date().toISOString();
    await Promise.all([
        addDoc(collection(db, "chats", chatId, "messages"), {
            senderId,
            text,
            timestamp: now,
        }),
        updateDoc(doc(db, "chats", chatId), { lastMessageAt: now }),
    ]);
}

// ── User profiles ─────────────────────────────────────────────────

/**
 * Fetch a single user profile by their ID.
 */
export async function getUserProfile(
    userId: string
): Promise<DocumentData | null> {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Update mutable parts of a user's profile.
 */
export async function updateUserProfile(
    userId: string,
    updates: Partial<{ displayName: string; bio: string }>
): Promise<void> {
    await updateDoc(doc(db, "users", userId), updates);
}
