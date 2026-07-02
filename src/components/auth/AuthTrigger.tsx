"use client";

import { useAuthModal } from "@/contexts/AuthModalContext";
import type { AuthMode } from "@/lib/authInsights";

interface AuthTriggerProps {
  mode: AuthMode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export default function AuthTrigger({
  mode,
  children,
  className,
  style,
  onClick,
}: AuthTriggerProps) {
  const { openLogin, openSignup } = useAuthModal();
  const open = mode === "login" ? openLogin : openSignup;

  return (
    <button
      type="button"
      className={["cursor-pointer", className].filter(Boolean).join(" ")}
      style={style}
      onClick={() => {
        onClick?.();
        open();
      }}
    >
      {children}
    </button>
  );
}