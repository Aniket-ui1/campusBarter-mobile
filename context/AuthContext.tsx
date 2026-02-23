// context/AuthContext.tsx
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
import azureConfig from "../config/azureConfig";

WebBrowser.maybeCompleteAuthSession();

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
  loginWithMicrosoft: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Decode JWT payload
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // later: load persisted user/token
  }, []);

  const isSaitEmail = (email: string) => {
    const lower = email.toLowerCase().trim();
    return lower.endsWith("@sait.ca") || lower.endsWith("@edu.sait.ca");
  };

  // ---------- Existing fake email+password login (kept for now) ----------
  const login = async (email: string, password: string) => {
    setIsLoading(true);

    try {
      if (!email || !password) {
        alert("Please enter both email and password.");
        return;
      }

      if (!isSaitEmail(email)) {
        alert("Only SAIT student emails (@sait.ca / @edu.sait.ca) are allowed.");
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();

      setUser({
        id: "mock-azure-user-id",
        name: "SAIT Student",
        email: normalizedEmail,
        credits: 3,
        bio: "SAIT student ready to barter!",
      });

      router.replace("/(tabs)");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);

    try {
      if (!name || !email || !password) {
        alert("Please fill in all fields.");
        return;
      }

      if (!isSaitEmail(email)) {
        alert("Registration failed. Please use a valid SAIT student email.");
        return;
      }

      const normalizedEmail = email.toLowerCase().trim();

      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : Math.random().toString();

      setUser({
        id,
        name,
        email: normalizedEmail,
        credits: 3,
        bio: "",
      });

      router.replace("/(tabs)");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    router.replace("/login");
  };

  // ---------- New: Microsoft Entra ID login ----------
  const discovery = AuthSession.useAutoDiscovery(azureConfig.discoveryUrl);

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "campusbartermobile", // matches app.json scheme
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
    discovery ?? undefined
  );

  useEffect(() => {
    if (!response || response.type !== "success" || !discovery) return;

    const exchangeCode = async () => {
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
          throw new Error(
            "No id_token returned from Azure. Make sure 'openid' scope is included."
          );
        }

        const claims = decodeJwtPayload(idToken);
        const email: string = claims.preferred_username ?? claims.email ?? "";

        if (!isSaitEmail(email)) {
          throw new Error(
            `Only @sait.ca and @edu.sait.ca accounts are allowed. Got: ${email}`
          );
        }

        const name = claims.name ?? "SAIT Student";

        setUser({
          id: claims.oid ?? claims.sub ?? "azure-user-id",
          name,
          email: email.toLowerCase().trim(),
          credits: 3,
          bio: "SAIT student ready to barter!",
        });

        router.replace("/(tabs)");
      } catch (err) {
        console.error("Token exchange failed:", err);
        alert(err instanceof Error ? err.message : "Microsoft login failed");
      } finally {
        setIsLoading(false);
      }
    };

    exchangeCode();
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
      value={{ user, isLoading, login, register, logout, loginWithMicrosoft }}
    >
      {children}
    </AuthContext.Provider>
  );
};
