"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import AuthModal from "@/components/auth/AuthModal";
import type { AuthMode } from "@/lib/authInsights";

interface AuthModalContextValue {
  openLogin: () => void;
  openSignup: () => void;
  closeAuth: () => void;
  isOpen: boolean;
  mode: AuthMode;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");

  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  useEffect(() => {
    if (pathname === "/login") {
      setMode("login");
      setOpen(true);
    } else if (pathname === "/signup") {
      setMode("signup");
      setOpen(true);
    }
  }, [pathname]);

  const closeAuth = useCallback(() => {
    setOpen(false);
    if (isAuthRoute) {
      router.replace("/");
    }
  }, [isAuthRoute, router]);

  const openLogin = useCallback(() => {
    setMode("login");
    setOpen(true);
  }, []);

  const openSignup = useCallback(() => {
    setMode("signup");
    setOpen(true);
  }, []);

  const value = useMemo(
    () => ({ openLogin, openSignup, closeAuth, isOpen: open, mode }),
    [openLogin, openSignup, closeAuth, open, mode],
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {open && (
        <AuthModal mode={mode} onModeChange={setMode} onClose={closeAuth} />
      )}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return ctx;
}