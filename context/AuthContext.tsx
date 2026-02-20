import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User } from '@/types';
import { MOCK_CURRENT_USER } from '@/data/mock';

type AuthContextType = {
    user: User | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (data: SignUpData) => Promise<void>;
    signOut: () => void;
    resetPassword: (email: string) => Promise<void>;
    updateProfile: (data: Partial<User>) => void;
};

export type SignUpData = {
    email: string;
    password: string;
    program: string;
    major: string;
    semester: number;
    campus: string;
    displayName: string;
    bio?: string;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: false,
    signIn: async () => { },
    signUp: async () => { },
    signOut: () => { },
    resetPassword: async () => { },
    updateProfile: () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const signIn = useCallback(async (_email: string, _password: string) => {
        setIsLoading(true);
        try {
            // TODO: Replace with Firebase Auth
            await new Promise((r) => setTimeout(r, 800));
            setUser(MOCK_CURRENT_USER);
        } catch (error) {
            console.error('Sign in failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const signUp = useCallback(async (data: SignUpData) => {
        setIsLoading(true);
        try {
            // TODO: Replace with Firebase Auth + Firestore
            await new Promise((r) => setTimeout(r, 1000));
            setUser({
                ...MOCK_CURRENT_USER,
                email: data.email,
                displayName: data.displayName,
                program: data.program,
                major: data.major,
                semester: data.semester,
                campus: data.campus,
                bio: data.bio || '',
            });
        } catch (error) {
            console.error('Sign up failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const signOut = useCallback(() => {
        setUser(null);
    }, []);

    const resetPassword = useCallback(async (_email: string) => {
        setIsLoading(true);
        try {
            // TODO: Replace with Firebase Auth
            await new Promise((r) => setTimeout(r, 600));
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateProfile = useCallback((data: Partial<User>) => {
        setUser((prev) => prev ? { ...prev, ...data } : null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, resetPassword, updateProfile }}>
            {children}
        </AuthContext.Provider>
    );
}
