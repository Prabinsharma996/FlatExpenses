import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthApi } from "../api/endpoints";
import { clearToken, getToken, saveToken } from "../api/client";
import { User } from "../types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        try {
          const { data } = await AuthApi.me();
          setUser(data.user);
        } catch {
          await clearToken();
        }
      }
      setLoading(false);
    })();
  }, []);

  async function login(email: string, password: string) {
    const { data } = await AuthApi.login(email, password);
    await saveToken(data.token);
    setUser(data.user);
  }

  async function register(name: string, email: string, password: string) {
    const { data } = await AuthApi.register(name, email, password);
    await saveToken(data.token);
    setUser(data.user);
  }

  async function logout() {
    await clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
