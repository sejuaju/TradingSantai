"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";


export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a1a]/95 backdrop-blur-md border-b border-white/5">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-10">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}

          <a href="#beranda" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"  
              alt="Logo"
              width={32}
              height={32}
              className="rounded-full"
            />
            <span className="text-sm font-semibold text-white hidden sm:block">Trading Santai </span>
          </a>

          {/* Center Nav Links - pill shaped */}
          <div className="hidden md:flex items-center gap-1 bg-[#252525] rounded-full px-1 py-1">
            <a
              href="#komunitas"
              className="px-5 py-1.5 text-sm text-white/80 hover:text-white rounded-full border border-white/10 hover:border-white/20 transition-all"
            >
              Exclusive Community
            </a>
            <a
              href="#ecourse"
              className="flex items-center gap-2 px-5 py-1.5 text-sm text-white/80 hover:text-white rounded-full transition-all"
            >
              e-course
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-accent text-black rounded-full">
                Coming Soon
              </span>
            </a>
          </div>

          {/* Right - Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="#login"
              className="px-5 py-1.5 text-sm text-white border border-white/20 rounded-full hover:border-white/40 transition-all"
            >
              Login
            </a>
            <a
              href="#signup"
              className="px-5 py-1.5 text-sm text-black bg-white rounded-full hover:bg-white/90 font-medium transition-all"
            >
              Sign Up
            </a>
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 text-white/70 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 bg-[#1a1a1a]">
          <div className="px-4 py-4 space-y-3">
            <a
              href="#komunitas"
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-white/70 hover:text-white transition-colors"
            >
              Exclusive Community
            </a>
            <a
              href="#ecourse"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
            >
              e-course
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-accent text-black rounded-full">
                Coming Soon
              </span>
            </a>
            <div className="flex gap-3 pt-2">
              <a
                href="#login"
                className="flex-1 text-center px-4 py-2 text-sm text-white border border-white/20 rounded-full"
              >
                Login
              </a>
              <a
                href="#signup"
                className="flex-1 text-center px-4 py-2 text-sm text-black bg-white rounded-full font-medium"
              >
                Sign Up
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
