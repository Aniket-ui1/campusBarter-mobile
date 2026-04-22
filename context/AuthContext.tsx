import * as AuthSession from "expo-auth-session";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { Platform } from "react-native";
import azureConfig from "../config/azureConfig";
import {
    clearApiToken,
    getMyProfile,
    registerPushToken,
    setApiToken,
    setDevUser,
    updateMyProfile,
    upsertUserProfile,
} from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";

WebBrowser.maybeCompleteAuthSession();

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

export interface User {
    id: string;
    name: string;
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
    profileComplete?: boolean;
    avatarUrl?: string;
    role?: string;
}

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

interface AuthContextType {
    user: User | null;
    users: User[];
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    loginWithMicrosoft: () => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    signUp: (data: SignUpData) => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateProfile: (updates: Partial<Omit<User, "id" | "email">>) => Promise<void>;
    completeProfile: (data: {
        program: string;
        major: string;
        semester: number;
        skills: string[];
        weaknesses: string[];
        interests: string[];
    }) => Promise<void>;
}

const AUTH_KEY = "campusbarter_user";
const TOKEN_KEY = "campusbarter_token";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

function decodeJwtPayload(token: string): Record<string, any> {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
        atob(base64)
            .split("")
            .map((character) => "%" + ("00" + character.charCodeAt(0).toString(16)).slice(-2))
            .join("")
    );
    return JSON.parse(jsonPayload);
}

function normalizeRole(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const normalized = value.trim();
    if (!normalized) return undefined;
    const lower = normalized.toLowerCase();
    if (lower === "admin" || lower === "administrator") return "Admin";
    if (lower === "moderator") return "Moderator";
    if (lower === "student") return "Student";
    return normalized;
}

async function syncUserToApi(user: User) {
    await upsertUserProfile({
        id: user.id,
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
    });
}

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
        role: "Student",
        ...partial,
    };
}

function mergeApiProfileIntoUser(base: User, profile: any): User {
    if (!profile) return base;
    const displayName = profile.displayName ?? base.displayName ?? base.name;
    return {
        ...base,
        id: profile.id ?? base.id,
        name: displayName,
        displayName,
        email: profile.email ?? base.email,
        bio: profile.bio ?? base.bio,
        credits: typeof profile.credits === "number" ? profile.credits : base.credits,
        program: profile.program ?? base.program,
        major: profile.major ?? base.major,
        semester: profile.semester ?? base.semester,
        rating: profile.rating ?? base.rating,
        reviewCount: profile.reviewCount ?? base.reviewCount,
        skills: profile.skills ?? base.skills,
        weaknesses: profile.weaknesses ?? base.weaknesses,
        interests: profile.interests ?? base.interests,
        profileComplete: profile.profileComplete ?? base.profileComplete,
        avatarUrl: profile.avatarUrl ?? base.avatarUrl,
        role: normalizeRole(profile.role) ?? base.role,
    };
}

function isSaitEmail(email: string) {
    const lower = email.toLowerCase().trim();
    return (
        lower.endsWith("@sait.ca") ||
        lower.endsWith("@edu.sait.ca") ||
        lower.endsWith("@campusbarter.onmicrosoft.com")
    );
}

function defaultNameFromEmail(email: string) {
    const localPart = email.split("@")[0] ?? "student";
    const cleaned = localPart.replace(/[._-]+/g, " ").trim();
    if (!cleaned) {
        return "SAIT Student";
    }

    return cleaned
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function resolveRoleFromEmail(email: string): string {
    return email.startsWith("admin@") ? "Admin" : "Student";
}

const MOCK_USERS: User[] = [
    {
        id: "admin1",
        name: "Campus Admin",
        displayName: "Campus Admin",
        email: "admin@sait.ca",
        credits: 999,
        bio: "Platform administrator account",
        role: "Admin",
    },
    {
        id: "user2",
        name: "MathWhiz",
        displayName: "MathWhiz",
        email: "mathwhiz@edu.sait.ca",
        credits: 5,
        bio: "Calculus tutor",
        role: "Student",
    },
    {
        id: "user3",
        name: "MoverNeeded",
        displayName: "MoverNeeded",
        email: "moverneeded@edu.sait.ca",
        credits: 2,
        bio: "Happy to trade campus help",
        role: "Student",
    },
];

function createId() {
    return Math.random().toString(36).slice(2, 10);
}

function upsertUser(list: User[], nextUser: User): User[] {
    const index = list.findIndex(
        (knownUser) => knownUser.id === nextUser.id || knownUser.email.toLowerCase() === nextUser.email.toLowerCase()
    );

    if (index === -1) {
        return [nextUser, ...list];
    }

    const copy = [...list];
    copy[index] = nextUser;
    return copy;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>(MOCK_USERS);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const stored = await storage.getItem(AUTH_KEY);
                if (!stored) {
                    return;
                }

                const parsed = JSON.parse(stored) as User;
                const hydrated = {
                    ...parsed,
                    displayName: parsed.displayName ?? parsed.name,
                    name: parsed.name ?? parsed.displayName,
                    profileComplete: parsed.profileComplete ?? false,
                    role: normalizeRole(parsed.role) ?? parsed.role,
                };

                setUser(hydrated);
                setUsers((currentUsers) => upsertUser(currentUsers, hydrated));

                const savedToken = await storage.getItem(TOKEN_KEY);
                if (!savedToken) {
                    return;
                }

                setApiToken(savedToken);

                if (savedToken.startsWith("mock-")) {
                    setDevUser({
                        id: hydrated.id,
                        email: hydrated.email,
                        name: hydrated.displayName || hydrated.name || "SAIT Student",
                    });
                }

                connectSocket();

                try {
                    const profile = await getMyProfile();
                    const refreshed = mergeApiProfileIntoUser(hydrated, profile);
                    setUser(refreshed);
                    setUsers((currentUsers) => upsertUser(currentUsers, refreshed));
                    await storage.setItem(AUTH_KEY, JSON.stringify(refreshed));
                    void registerDevicePushToken();
                } catch (error) {
                    if ((error as { status?: number }).status === 401) {
                        setUser(null);
                        await storage.deleteItem(AUTH_KEY);
                        await storage.deleteItem(TOKEN_KEY);
                        clearApiToken();
                        disconnectSocket();
                    }
                }
            } catch (error) {
                console.warn("Could not restore session:", error);
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    async function registerDevicePushToken(): Promise<void> {
        if (Platform.OS === "web") return;

        try {
            const Notifications = await import("expo-notifications");
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== "granted") return;

            const tokenResult = await Notifications.getExpoPushTokenAsync();
            const expoPushToken = tokenResult.data;
            const platform = Platform.OS === "ios" ? "ios" : "android";

            await registerPushToken(expoPushToken).catch(() => {});
            const { chatApi } = await import("../services/chatApi");
            await chatApi.registerPushToken(expoPushToken, platform).catch(() => {});
        } catch {
            // Push is optional on web and in simulator environments.
        }
    }

    async function persistUser(nextUser: User, idToken?: string): Promise<void> {
        setUser(nextUser);
        setUsers((currentUsers) => upsertUser(currentUsers, nextUser));
        await storage.setItem(AUTH_KEY, JSON.stringify(nextUser));

        if (idToken) {
            setApiToken(idToken);
            await storage.setItem(TOKEN_KEY, idToken);
            connectSocket();
        }

        try {
            await syncUserToApi(nextUser);
        } catch (error) {
            console.error("[Auth] User sync failed:", error);
        }

        try {
            const profile = await getMyProfile();
            const refreshed = mergeApiProfileIntoUser(nextUser, profile);
            setUser(refreshed);
            setUsers((currentUsers) => upsertUser(currentUsers, refreshed));
            await storage.setItem(AUTH_KEY, JSON.stringify(refreshed));
        } catch (error) {
            console.warn("[Auth] Could not refresh profile after sync:", error);
        }

        if (idToken) {
            void registerDevicePushToken();
        }
    }

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();

            if (!normalizedEmail || !password) {
                alert("Please enter both email and password.");
                return;
            }

            if (!isSaitEmail(normalizedEmail)) {
                alert("Only SAIT student emails (@sait.ca / @edu.sait.ca) are allowed.");
                return;
            }

            const existingUser = users.find(
                (knownUser) => knownUser.email.toLowerCase() === normalizedEmail
            );

            const mockToken = `mock-${existingUser?.id ?? normalizedEmail.replace(/[^a-z0-9]/g, "-")}`;

            setDevUser({
                id: existingUser?.id ?? mockToken.slice(5),
                email: normalizedEmail,
                name: existingUser?.displayName ?? existingUser?.name ?? defaultNameFromEmail(normalizedEmail),
            });

            const existingProfile = await getMyProfile().catch((error) => {
                console.warn("Could not check existing profile:", error);
                return null;
            });

            const nextUser = existingUser
                ? mergeApiProfileIntoUser(existingUser, existingProfile)
                : makeUser(
                    mockToken.slice(5),
                    existingProfile?.displayName ?? defaultNameFromEmail(normalizedEmail),
                    normalizedEmail,
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
                        role: resolveRoleFromEmail(normalizedEmail),
                    }
                );

            await persistUser(nextUser, mockToken);
            router.replace("/(tabs)");
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (name: string, email: string, password: string) => {
        setIsLoading(true);
        try {
            const normalizedEmail = email.trim().toLowerCase();

            if (!name || !normalizedEmail || !password) {
                alert("Please fill in all fields.");
                return;
            }

            if (!isSaitEmail(normalizedEmail)) {
                alert("Registration failed. Please use a valid SAIT student email.");
                return;
            }

            const existingUser = users.find(
                (knownUser) => knownUser.email.toLowerCase() === normalizedEmail
            );

            if (existingUser) {
                alert("An account with this email already exists. Please sign in.");
                return;
            }

            const id = createId();
            const nextUser = makeUser(id, name, normalizedEmail, {
                role: resolveRoleFromEmail(normalizedEmail),
            });
            const mockToken = `mock-${id}`;

            setDevUser({ id, email: normalizedEmail, name });
            await persistUser(nextUser, mockToken);
            router.replace("/(tabs)");
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setUser(null);
        await storage.deleteItem(AUTH_KEY);
        await storage.deleteItem(TOKEN_KEY);
        clearApiToken();
        disconnectSocket();
        router.replace("/(auth)/sign-in");
    };

    const signIn = login;
    const signOut = logout;

    const signUp = async (data: SignUpData) => {
        setIsLoading(true);
        try {
            const normalizedEmail = data.email.trim().toLowerCase();

            if (!isSaitEmail(normalizedEmail)) {
                alert("Registration failed. Please use a valid SAIT student email.");
                return;
            }

            const id = createId();
            const nextUser = makeUser(id, data.displayName, normalizedEmail, {
                bio: data.bio ?? "",
                program: data.program,
                major: data.major,
                semester: data.semester,
                role: resolveRoleFromEmail(normalizedEmail),
            });
            const mockToken = `mock-${id}`;

            setDevUser({ id, email: normalizedEmail, name: data.displayName });
            await persistUser(nextUser, mockToken);
            router.replace("/(tabs)");
        } finally {
            setIsLoading(false);
        }
    };

    const resetPassword = async (_email: string) => {
        alert(
            "Password reset is managed by your Microsoft account.\n\nVisit: https://aka.ms/sspr\nto reset your @sait.ca or @edu.sait.ca password."
        );
    };

    const updateProfile = async (updates: Partial<Omit<User, "id" | "email">>) => {
        if (!user) return;

        const updated: User = {
            ...user,
            ...updates,
            name: updates.displayName ?? updates.name ?? user.name,
            displayName: updates.displayName ?? user.displayName,
            role: updates.role ?? user.role,
        };

        await persistUser(updated);

        try {
            await updateMyProfile({
                ...(updates.displayName ? { displayName: updates.displayName } : {}),
                ...(updates.bio !== undefined ? { bio: updates.bio } : {}),
                ...(updates.program ? { program: updates.program } : {}),
                ...(updates.major ? { major: updates.major } : {}),
                ...(updates.semester ? { semester: updates.semester } : {}),
                ...(updates.skills ? { skills: updates.skills } : {}),
                ...(updates.weaknesses ? { weaknesses: updates.weaknesses } : {}),
                ...(updates.interests ? { interests: updates.interests } : {}),
                ...(updates.avatarUrl !== undefined ? { avatarUrl: updates.avatarUrl } : {}),
                ...(updates.role ? { role: updates.role } : {}),
            });
        } catch (error) {
            console.warn("API profile update failed:", error);
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

        setIsLoading(true);
        try {
            const updated: User = {
                ...user,
                ...data,
                profileComplete: true,
            };

            await persistUser(updated);

            try {
                await updateMyProfile({
                    ...data,
                    profileComplete: true,
                });
            } catch (error) {
                console.warn("API completeProfile failed:", error);
            }

            router.replace("/(tabs)");
        } finally {
            setIsLoading(false);
        }
    };

    const discovery = AuthSession.useAutoDiscovery(azureConfig.discoveryUrl);

    const redirectUri = AuthSession.makeRedirectUri({
        path: "redirect",
    });

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
                const email = String(claims.preferred_username ?? claims.email ?? "").toLowerCase().trim();
                const userId = String(claims.oid ?? claims.sub ?? "azure-user-id");
                const displayName = String(claims.name ?? "SAIT Student");
                const roleFromClaims = normalizeRole(
                    claims["campusbarter_role"] ?? claims["role"] ?? claims["roles"]?.[0]
                );

                setApiToken(idToken);

                const existingProfile = await getMyProfile().catch((error) => {
                    console.warn("Could not check existing profile:", error);
                    return null;
                });

                const nextUser = makeUser(userId, displayName, email, {
                    bio: existingProfile?.bio ?? "CampusBarter student ready to trade skills!",
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
                    role: normalizeRole(existingProfile?.role) ?? roleFromClaims,
                });

                await persistUser(nextUser, idToken);
                router.replace("/(tabs)");
            } catch (error) {
                console.error("Token exchange failed:", error);
                alert(error instanceof Error ? error.message : "Microsoft login failed");
            } finally {
                setIsLoading(false);
            }
        })();
    }, [response, discovery, request, redirectUri]);

    const loginWithMicrosoft = async () => {
        if (!request) {
            alert("Microsoft login not ready yet. Please try again in a moment.");
            return;
        }

        setIsLoading(true);
        try {
            await promptAsync();
        } catch (error) {
            console.error("promptAsync failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                users,
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