"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import UserMenu from "@/components/auth/UserMenu";
import AuthTrigger from "@/components/auth/AuthTrigger";
import { getDisplayName } from "@/lib/profile";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, loading, signOut } = useAuth();

  const displayName = getDisplayName(user);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-md border-b border-white/5">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-14">
          <a href="#beranda" className="flex items-center gap-2.5 cursor-pointer">
            <Image
              src="/logo.png"
              alt="Logo"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-sm font-semibold text-white hidden sm:block">Trading Santai </span>
          </a>

          <div className="hidden md:flex items-center gap-1 bg-[#252525] rounded-full px-1 py-1">
            <Link
              href="/strategy-lab"
              className="px-5 py-1.5 text-sm text-white/80 hover:text-white rounded-full border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              Strategy Lab
            </Link>
            <a
              href="#komunitas"
              className="px-5 py-1.5 text-sm text-white/80 hover:text-white rounded-full border border-white/10 hover:border-white/20 transition-all cursor-pointer"
            >
              Exclusive Community
            </a>
            <a
              href="#ecourse"
              className="flex items-center gap-2 px-5 py-1.5 text-sm text-white/80 hover:text-white rounded-full transition-all cursor-pointer"
            >
              e-course
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-accent text-black rounded-full">
                Coming Soon
              </span>
            </a>
          </div>

          <div className="hidden md:flex items-center">
            {loading ? (
              <div className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-[#252525] border border-white/10">
                <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
                <div className="w-14 h-2.5 rounded-full bg-white/10 animate-pulse" />
              </div>
            ) : user ? (
              <UserMenu user={user} displayName={displayName} onSignOut={signOut} />
            ) : (
              <div className="flex items-center gap-3">
                <AuthTrigger mode="login" className="px-5 py-1.5 text-sm text-white border border-white/20 rounded-full hover:border-white/40 transition-all cursor-pointer">
                  Login
                </AuthTrigger>
                <AuthTrigger mode="signup" className="px-5 py-1.5 text-sm text-black bg-white rounded-full hover:bg-white/90 font-medium transition-all cursor-pointer">
                  Sign Up
                </AuthTrigger>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            {!loading && user && (
              <UserMenu
                user={user}
                displayName={displayName}
                onSignOut={signOut}
                variant="compact"
              />
            )}
            <button
              className="p-2 text-white/70 hover:text-white cursor-pointer"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#1a1a1a]">
          <div className="px-4 py-4 space-y-3">
            <Link
              href="/strategy-lab"
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              Strategy Lab
            </Link>
            <a
              href="#komunitas"
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              Exclusive Community
            </a>
            <a
              href="#ecourse"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              e-course
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-accent text-black rounded-full">
                Coming Soon
              </span>
            </a>

            {loading ? (
              <div className="h-16 rounded-2xl bg-white/5 animate-pulse mt-2" />
            ) : user ? (
              <UserMenu
                user={user}
                displayName={displayName}
                onSignOut={signOut}
                variant="mobile"
                onClose={() => setMobileOpen(false)}
              />
            ) : (
              <div className="flex gap-3 pt-2">
                <AuthTrigger
                  mode="login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-2 text-sm text-white border border-white/20 rounded-full cursor-pointer"
                >
                  Login
                </AuthTrigger>
                <AuthTrigger
                  mode="signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-2 text-sm text-black bg-white rounded-full font-medium cursor-pointer"
                >
                  Sign Up
                </AuthTrigger>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}