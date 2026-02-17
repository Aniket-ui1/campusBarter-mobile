import React, { createContext, useContext, useState, useEffect } from "react";
import { router } from "expo-router";

// Define User Interface
export interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  credits: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check for persisted user (mock)
  useEffect(() => {
    // In a real app, check AsyncStorage here
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      // Mock validation
      if (email.endsWith("@edu.sait.ca") || email.endsWith("@sait.ca")) {
         setUser({
          id: "1",
          name: "Test Student",
          email,
          credits: 3,
          bio: "SAIT student ready to barter!",
        });
        router.replace("/(tabs)");
      } else {
        alert("Invalid SAIT email or password");
      }
      setIsLoading(false);
    }, 1000);
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setTimeout(() => {
      if (email.endsWith("@edu.sait.ca") || email.endsWith("@sait.ca")) {
        setUser({
          id: Math.random().toString(),
          name,
          email,
          credits: 3, // Default starting credits
          bio: "",
        });
        router.replace("/(tabs)");
      } else {
        alert("Registration failed. Please use a valid SAIT email.");
      }
      setIsLoading(false);
    }, 1000);
  };

  const logout = () => {
    setUser(null);
    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
