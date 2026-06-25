import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  businessName?: string;
  role: string;
  membershipTier: string;
  membershipPrice?: number;
  state?: string;
  city?: string;
  phone?: string;
  bio?: string;
  avatarUrl?: string;
  referralCode?: string;
  referralCredit?: number;
  referredBy?: number | null;
  isActive?: boolean;
  joinedAt?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<{ user: any; tier: string; price: number }>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    // Try to restore session from memory (React state only, no localStorage)
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Login failed");
      }
      const data = await res.json();
      setUser(data.user);
      setUserId(data.user.id);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setUserId(null);
  };

  const register = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/register", data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Registration failed");
      }
      const result = await res.json();
      setUser(result.user);
      setUserId(result.user.id);
      return { user: result.user, tier: result.tier, price: result.price };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
