// context/AuthContext.tsx
import * as AuthSession from "expo-auth-session";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";

// Cross-platform storage: SecureStore on native, localStorage on web
const storage = {
    async getItem(key: string): Promise<string | null> {
        if (Platform.OS === "web") {
            return localStorage.getItem(key);
        }
        const SecureStore = await import("expo-secure-store");
        return SecureStore.getItemAsync(key);
    },
    async setItem(key: string, value: string): Promise<void> {
        if (Platform.OS === "web") {
            localStorage.setItem(key, value);
            return;
        }
        const SecureStore = await import("expo-secure-store");
        await SecureStore.setItemAsync(key, value);
    },
    async deleteItem(key: string): Promise<void> {
        if (Platform.OS === "web") {
            localStorage.removeItem(key);
            return;
        }
        const SecureStore = await import("expo-secure-store");
        await SecureStore.deleteItemAsync(key);
    },
};
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import azureConfig from "../config/azureConfig";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { setApiToken, clearApiToken, registerPushToken } from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";

WebBrowser.maybeCompleteAuthSession();

// ── User type — covers every field used across all screens ───────

export interface User {
    id: string;
    /** Primary display name shown in the UI */
    name: string;
    /** Alias used by profile.tsx / edit-profile.tsx */
    displayName: string;
    email: string;
    bio?: string;
    credits: number;
    program?: string;
    major?: string;
    semester?: number;
    rating?: number;
    reviewCount?: number;
    skills?: string[];
    weaknesses?: string[];
    interests?: string[];
    /** false until the user completes the profile-setup screen */
    profileComplete?: boolean;
    avatarUrl?: string;
}

// ── SignUpData — used by register-step3.tsx ───────────────────────

export interface SignUpData {
    email: string;
    password: string;
    displayName: string;
    program: string;
    major: string;
    semester: number;
    campus?: string;
    bio?: string;

}

// ── Context type — all methods past + present ─────────────────────

interface AuthContextType {
    user: User | null;
    isLoading: boolean;

    // New canonical names

    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    loginWithMicrosoft: () => Promise<void>;

    // Legacy aliases (used by existing screens — kept for compatibility)
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => void;
    signUp: (data: SignUpData) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateProfile: (updates: Partial<Omit<User, "id" | "email">>) => void;
    completeProfile: (data: {
        program: string;
        major: string;
        semester: number;
        skills: string[];
        weaknesses: string[];
        interests: string[];
    }) => Promise<void>;

}

// ── Constants ─────────────────────────────────────────────────────

const AUTH_KEY = "campusbarter_user";

// ── Context ───────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

// ── JWT decode helper ─────────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, any> {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
        atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
    );
    return JSON.parse(jsonPayload);
}

// ── Firestore helpers ──────────────────────────────────────────────

/** Creates the Firestore /users/{id} doc on first login (non-destructive) */
async function upsertFirestoreUser(user: User) {
    try {
        const ref = doc(db, "users", user.id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            await setDoc(ref, {
                displayName: user.displayName,
                email: user.email,
                bio: user.bio ?? "",
                credits: user.credits,
                program: user.program ?? "",
                major: user.major ?? "",
                semester: user.semester ?? 1,
                rating: user.rating ?? 0,
                reviewCount: user.reviewCount ?? 0,
                skills: user.skills ?? [],
                weaknesses: user.weaknesses ?? [],
                interests: user.interests ?? [],
                profileComplete: user.profileComplete ?? false,
                avatarUrl: user.avatarUrl ?? "",
                createdAt: serverTimestamp(),
            });
        }
    } catch (e) {
        console.warn("Firestore upsert failed (offline?):", e);
    }
}

/** Build a User object, keeping name and displayName in sync */
function makeUser(
    id: string,
    displayName: string,
    email: string,
    partial: Partial<User> = {}
): User {
    return {
        id,
        name: displayName,
        displayName,
        email,
        credits: 3,
        bio: "",
        program: "",
        major: "",
        semester: 1,
        rating: 0,
        reviewCount: 0,
        skills: [],
        weaknesses: [],
        interests: [],
        profileComplete: false,
        ...partial,
    };
}

// ── Email domain guard ────────────────────────────────────────────

function isSaitEmail(email: string) {
    const lower = email.toLowerCase().trim();
    return (
        lower.endsWith("@sait.ca") ||
        lower.endsWith("@edu.sait.ca") ||
        lower.endsWith("@campusbarter.onmicrosoft.com")
    );
}

// ── Provider ─────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true); // true until SecureStore resolves

    // Restore session on app open
    useEffect(() => {
        (async () => {
            try {
                const stored = await storage.getItem(AUTH_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    // Ensure old sessions without profileComplete are handled
                    if (parsed.profileComplete === undefined) {
                        parsed.profileComplete = false;
                    }
                    setUser(parsed);
                }
            } catch (e) {
                console.warn("Could not restore session:", e);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const persistUser = async (u: User, idToken?: string) => {
        setUser(u);
        await storage.setItem(AUTH_KEY, JSON.stringify(u));
        await upsertFirestoreUser(u);
        // Wire up Azure API + socket if we have a real Microsoft token
        if (idToken) {
            setApiToken(idToken);
            connectSocket();
            // Register push token (best effort — ignore failure)
            try {
                const Notifications = await import('expo-notifications');
                const { status } = await Notifications.requestPermissionsAsync();
                if (status === 'granted') {
                    const tokenRes = await Notifications.getExpoPushTokenAsync();
                    await registerPushToken(tokenRes.data).catch(() => { });
                }
            } catch { /* push not available on web / simulator */ }
        }
    };

    // ── Core auth actions ─────────────────────────────────────────

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            if (!email || !password) { alert("Please enter both email and password."); return; }
            if (!isSaitEmail(email)) { alert("Only SAIT student emails (@sait.ca / @edu.sait.ca) are allowed."); return; }
            const userId = "mock-" + email.toLowerCase().trim().replace(/[^a-z0-9]/g, "-");

            // Restore existing profile from Firestore if it exists
            let existingProfile: any = null;
            try {
                const snap = await getDoc(doc(db, "users", userId));
                if (snap.exists()) existingProfile = snap.data();
            } catch (e) {
                console.warn("Could not check existing profile:", e);
            }

            const u = makeUser(
                userId,
                existingProfile?.displayName ?? "SAIT Student",
                email.toLowerCase().trim(),
                {
                    bio: existingProfile?.bio ?? "SAIT student ready to barter!",
                    program: existingProfile?.program ?? "",
                    major: existingProfile?.major ?? "",
                    semester: existingProfile?.semester ?? 1,
                    skills: existingProfile?.skills ?? [],
                    weaknesses: existingProfile?.weaknesses ?? [],
                    interests: existingProfile?.interests ?? [],
                    profileComplete: existingProfile?.profileComplete ?? false,
                    avatarUrl: existingProfile?.avatarUrl ?? "",
                    rating: existingProfile?.rating ?? 0,
                    reviewCount: existingProfile?.reviewCount ?? 0,
                }
            );
            await persistUser(u);
            router.replace("/(tabs)");
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name: string, email: string, password: string) => {
        setIsLoading(true);
        try {
            if (!name || !email || !password) { alert("Please fill in all fields."); return; }
            if (!isSaitEmail(email)) { alert("Registration failed. Please use a valid SAIT student email."); return; }
            const id =
                typeof crypto !== "undefined" && "randomUUID" in crypto
                    ? crypto.randomUUID()
                    : Math.random().toString(36).slice(2);
            const u = makeUser(id, name, email.toLowerCase().trim());
            await persistUser(u);
            router.replace("/(tabs)");
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setUser(null);
        await storage.deleteItem(AUTH_KEY);
        clearApiToken();
        disconnectSocket();
        router.replace("/(auth)/sign-in");
    };

    // ── Legacy aliases (for backward-compatible screen code) ──────

    const signIn = login;
    const signOut = logout;

    const signUp = async (data: SignUpData) => {
        setIsLoading(true);
        try {
            if (!isSaitEmail(data.email)) {
                alert("Registration failed. Please use a valid SAIT student email.");
                return;
            }
            const id =
                typeof crypto !== "undefined" && "randomUUID" in crypto
                    ? crypto.randomUUID()
                    : Math.random().toString(36).slice(2);
            const u = makeUser(id, data.displayName, data.email.toLowerCase().trim(), {
                bio: data.bio ?? "",
                program: data.program,
                major: data.major,
                semester: data.semester,
            });
            await persistUser(u);
            router.replace("/(tabs)");
        } finally {
            setIsLoading(false);
        }
    };

    const resetPassword = async (email: string) => {
        // With Azure AD: password reset is done via Azure portal.
        // Here we just show a friendly message.
        alert(
            `Password reset is managed by your Microsoft account.\n\nVisit: https://aka.ms/sspr\nto reset your @sait.ca or @edu.sait.ca password.`
        );
    };

    const updateProfile = async (updates: Partial<Omit<User, "id" | "email">>) => {
        if (!user) return;
        const updated: User = {
            ...user,
            ...updates,
            name: updates.displayName ?? updates.name ?? user.name,
            displayName: updates.displayName ?? user.displayName,
        };
        await persistUser(updated);
        try {
            await updateDoc(doc(db, "users", user.id), {
                ...(updates.displayName ? { displayName: updates.displayName } : {}),
                ...(updates.bio !== undefined ? { bio: updates.bio } : {}),
                ...(updates.program ? { program: updates.program } : {}),
                ...(updates.major ? { major: updates.major } : {}),
                ...(updates.semester ? { semester: updates.semester } : {}),
                ...(updates.skills ? { skills: updates.skills } : {}),
                ...(updates.weaknesses ? { weaknesses: updates.weaknesses } : {}),
                ...(updates.interests ? { interests: updates.interests } : {}),
                ...(updates.avatarUrl !== undefined ? { avatarUrl: updates.avatarUrl } : {}),
            });
        } catch (e) {
            console.warn("Firestore profile update failed:", e);
        }
    };

    const completeProfile = async (data: {
        program: string;
        major: string;
        semester: number;
        skills: string[];
        weaknesses: string[];
        interests: string[];
    }) => {
        if (!user) return;
        const updated: User = {
            ...user,
            ...data,
            profileComplete: true,
        };
        await persistUser(updated);
        try {
            await updateDoc(doc(db, "users", user.id), {
                ...data,
                profileComplete: true,
            });
        } catch (e) {
            console.warn("Firestore completeProfile failed:", e);
        }
        router.replace("/(tabs)");
    };

    // ── Microsoft Entra ID login ──────────────────────────────────

    const discovery = AuthSession.useAutoDiscovery(azureConfig.discoveryUrl);

    const redirectUri = AuthSession.makeRedirectUri({
        path: "redirect",
    });

    // Log the redirect URI so you know exactly what to register in Azure
    console.log("🔑 Auth redirect URI:", redirectUri);


    const [request, response, promptAsync] = AuthSession.useAuthRequest(
        {
            clientId: azureConfig.clientId,
            scopes: azureConfig.scopes,
            redirectUri,
            responseType: AuthSession.ResponseType.Code,
            usePKCE: true,
            prompt: AuthSession.Prompt.SelectAccount,
        },
        discovery ?? null
    );

    useEffect(() => {
        if (!response || response.type !== "success" || !discovery) return;

        (async () => {
            try {
                setIsLoading(true);
                const { code } = response.params;

                const tokenResponse = await AuthSession.exchangeCodeAsync(
                    {
                        clientId: azureConfig.clientId,
                        code,
                        redirectUri,
                        extraParams: request?.codeVerifier
                            ? { code_verifier: request.codeVerifier }
                            : undefined,
                    },
                    discovery
                );

                const idToken = tokenResponse.idToken;
                if (!idToken) {
                    throw new Error("No id_token returned from Azure. Make sure 'openid' scope is included.");

                }

                const claims = decodeJwtPayload(idToken);
                const email: string = claims.preferred_username ?? claims.email ?? "";

                if (!isSaitEmail(email)) {
                    throw new Error(`Only @sait.ca and @edu.sait.ca accounts are allowed. Got: ${email}`);
                }

                const userId = claims.oid ?? claims.sub ?? "azure-user-id";
                const displayName = claims.name ?? "SAIT Student";
                const userEmail = email.toLowerCase().trim();

                // Check if user already has a complete profile in Firestore
                let existingProfile: any = null;
                try {
                    const snap = await getDoc(doc(db, "users", userId));
                    if (snap.exists()) existingProfile = snap.data();
                } catch (e) {
                    console.warn("Could not check existing profile:", e);
                }

                const u = makeUser(userId, displayName, userEmail, {
                    bio: existingProfile?.bio ?? "SAIT student ready to barter!",
                    program: existingProfile?.program ?? "",
                    major: existingProfile?.major ?? "",
                    semester: existingProfile?.semester ?? 1,
                    skills: existingProfile?.skills ?? [],
                    weaknesses: existingProfile?.weaknesses ?? [],
                    interests: existingProfile?.interests ?? [],
                    profileComplete: existingProfile?.profileComplete ?? false,
                    avatarUrl: existingProfile?.avatarUrl ?? "",
                    rating: existingProfile?.rating ?? 0,
                    reviewCount: existingProfile?.reviewCount ?? 0,
                });

                await persistUser(u, idToken);
                // Always go to tabs — ProfileSetupOverlay modal
                // will appear on top if profileComplete is false

                router.replace("/(tabs)");
            } catch (err) {
                console.error("Token exchange failed:", err);
                alert(err instanceof Error ? err.message : "Microsoft login failed");
            } finally {
                setIsLoading(false);
            }
        })();

    }, [response, discovery]);

    const loginWithMicrosoft = async () => {
        if (!request) {
            alert("Microsoft login not ready yet. Please try again in a moment.");
            return;
        }
        setIsLoading(true);
        try {
            await promptAsync();
        } catch (err) {
            console.error("promptAsync failed:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                login,
                register,
                logout,
                loginWithMicrosoft,
                signIn,
                signOut,
                signUp,
                resetPassword,
                updateProfile,
                completeProfile,
            }}

        >
            {children}
        </AuthContext.Provider>
    );
};
