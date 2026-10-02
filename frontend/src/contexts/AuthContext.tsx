"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { auth } from "@/lib/api";

interface User {
  id: number;
  name: string;
  email: string;
  organizations: Array<{ id: number; name: string; slug: string; pivot: { role: string } }>;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, password_confirmation: string) => Promise<void>;
  logout: () => Promise<void>;
  isOwnerOf: (orgId: number) => boolean;
  isAdminOf: (orgId: number) => boolean;
  isMemberOf: (orgId: number) => boolean;
  switchOrg: (orgId: number) => void;
  activeOrgId: number | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeOrgId, setActiveOrgId] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("token");
    if (stored) {
      setToken(stored);
      auth.me().then(({ data }) => {
        setUser(data.user);
        if (data.user.organizations?.length > 0) {
          setActiveOrgId(data.user.organizations[0].id);
        }
      }).catch(() => {
        localStorage.removeItem("token");
        setToken(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await auth.login({ email, password });
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    if (data.user.organizations?.length > 0) {
      setActiveOrgId(data.user.organizations[0].id);
    }
  };

  const register = async (name: string, email: string, password: string, password_confirmation: string) => {
    const { data } = await auth.register({ name, email, password, password_confirmation });
    localStorage.setItem("token", data.token);
    setToken(data.token);
    setUser(data.user);
    if (data.user.organizations?.length > 0) {
      setActiveOrgId(data.user.organizations[0].id);
    }
  };

  const logout = async () => {
    await auth.logout().catch(() => {});
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    setActiveOrgId(null);
  };

  const getOrgRole = (orgId: number) => {
    return user?.organizations?.find(o => o.id === orgId)?.pivot.role ?? null;
  };

  const isOwnerOf = (orgId: number) => getOrgRole(orgId) === "owner";
  const isAdminOf = (orgId: number) => ["owner", "admin"].includes(getOrgRole(orgId) ?? "");
  const isMemberOf = (orgId: number) => !!getOrgRole(orgId);

  const switchOrg = (orgId: number) => setActiveOrgId(orgId);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isOwnerOf, isAdminOf, isMemberOf, switchOrg, activeOrgId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
