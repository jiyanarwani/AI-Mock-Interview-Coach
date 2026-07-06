"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface AuthState {
  token: string | null;
  user: { id: string; email: string; full_name: string } | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (token: string, user: { id: string; email: string; full_name: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getInitialState(): AuthState {
  if (typeof window === "undefined") {
    return { token: null, user: null, isLoading: true };
  }
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      return { token, user, isLoading: false };
    } catch {
      return { token: null, user: null, isLoading: false };
    }
  }
  return { token: null, user: null, isLoading: false };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(getInitialState);

  const login = useCallback(
    (token: string, user: { id: string; email: string; full_name: string }) => {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      setState({ token, user, isLoading: false });
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setState({ token: null, user: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
