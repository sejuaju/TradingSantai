"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import UserAvatar from "@/components/auth/UserAvatar";

interface UserMenuProps {
  user: User;
  displayName: string;
  onSignOut: () => void;
  variant?: "desktop" | "mobile" | "compact";
  onClose?: () => void;
}

export default function UserMenu({
  user,
  displayName,
  onSignOut,
  variant = "desktop",
  onClose,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const email = user.email ?? "";

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
    onClose?.();
  }

  function handleSignOut() {
    closeMenu();
    onSignOut();
  }

  const dropdown = open && (
    <div
      role="menu"
      className="absolute right-0 top-[calc(100%+6px)] w-56 rounded-xl border border-white/10 bg-[#141414]/98 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden z-50"
    >
      <div className="px-3 py-2.5 border-b border-white/5 flex items-center gap-2.5 min-w-0">
        <UserAvatar user={user} displayName={displayName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-white truncate leading-tight">{displayName}</p>
          <p className="text-[10px] text-white/40 truncate leading-tight mt-0.5">{email}</p>
        </div>
      </div>

      <div className="p-1">
        <Link
          href="/profile"
          role="menuitem"
          onClick={closeMenu}
          className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        >
          <UserRound className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium">Edit Profil</span>
        </Link>
        <button
          type="button"
          role="menuitem"
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-lg text-white/70 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  if (variant === "mobile") {
    return (
      <div className="pt-2 mt-1 border-t border-white/5">
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#252525] border border-white/8">
          <UserAvatar user={user} displayName={displayName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate leading-tight">{displayName}</p>
            <p className="text-xs text-white/40 truncate leading-tight mt-0.5">{email}</p>
          </div>
        </div>
        <Link
          href="/profile"
          onClick={closeMenu}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-white/80 border border-white/12 rounded-full hover:border-white/25 hover:bg-white/5 transition-all cursor-pointer"
        >
          <UserRound className="w-3.5 h-3.5" />
          Edit Profil
        </Link>
        <button
          onClick={handleSignOut}
          className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm text-white/80 border border-white/12 rounded-full hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>
    );
  }

  const isCompact = variant === "compact";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Menu akun"
        className={`flex items-center rounded-full border transition-all duration-200 cursor-pointer ${
          isCompact ? "p-0.5" : "gap-2 pl-1 pr-2.5 py-1"
        } ${
          open
            ? "bg-white/[0.08] border-accent/30 ring-1 ring-accent/15"
            : "bg-[#252525]/90 border-white/10 hover:border-white/20 hover:bg-[#2c2c2c]"
        }`}
      >
        <UserAvatar user={user} displayName={displayName} size="sm" showStatus />
        {!isCompact && (
          <>
            <span className="text-sm font-medium text-white/90 truncate max-w-[100px] leading-none">
              {displayName}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-white/40 shrink-0 transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          </>
        )}
      </button>
      {dropdown}
    </div>
  );
}