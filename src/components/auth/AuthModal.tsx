"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";
import {
  pickAuthInsight,
  type AuthInsight,
  type AuthMode,
} from "@/lib/authInsights";

interface AuthModalProps {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onClose: () => void;
}

const MODE_COPY = {
  login: {
    title: "Selamat datang kembali",
    subtitle: "Masuk untuk mengaktifkan Manual Execution dan menyimpan posisi kamu.",
    footer:
      "Setiap kali kamu login, pesan ini berbeda. Pengingat kecil agar trading tetap terukur, bukan sekadar reaksi pada market.",
    gradient:
      "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(99,102,241,0.28), transparent 55%), " +
      "radial-gradient(ellipse 60% 50% at 80% 80%, rgba(34,197,94,0.12), transparent 50%), " +
      "linear-gradient(160deg, #0d1020 0%, #080a12 100%)",
  },
  signup: {
    title: "Buat akun member",
    subtitle: "Gratis untuk chart & sinyal. Simpan posisi dan profil trading kamu.",
    footer:
      "Pesan di panel kiri berubah setiap kali kamu membuka form, pengantar singkat sebelum kamu mulai.",
    gradient:
      "radial-gradient(ellipse 80% 60% at 20% 20%, rgba(34,197,94,0.18), transparent 55%), " +
      "radial-gradient(ellipse 60% 50% at 80% 80%, rgba(99,102,241,0.22), transparent 50%), " +
      "linear-gradient(160deg, #0d1020 0%, #080a12 100%)",
  },
} as const;

const SIGNUP_SUCCESS_MSG =
  "Akun berhasil dibuat. Silakan login untuk melanjutkan.";

export default function AuthModal({ mode, onModeChange, onClose }: AuthModalProps) {
  const [insight, setInsight] = useState<AuthInsight | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const copy = MODE_COPY[mode];
  const isLogin = mode === "login";

  function handleSignupSuccess() {
    setLoginNotice(SIGNUP_SUCCESS_MSG);
    onModeChange("login");
  }

  function handleModeChange(next: AuthMode) {
    if (next === "signup") setLoginNotice(null);
    onModeChange(next);
  }

  useEffect(() => {
    setInsight(pickAuthInsight(mode));
  }, [mode]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <button
        type="button"
        aria-label="Tutup"
        className="absolute inset-0 bg-[#05060c]/80 backdrop-blur-md cursor-pointer"
        onClick={onClose}
      />

      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0b14] shadow-2xl shadow-black/60 animate-fade-in-up flex flex-col md:flex-row">
        <div className="relative md:w-[52%] shrink-0 overflow-hidden border-b md:border-b-0 md:border-r border-white/8">
          <div
            className="absolute inset-0 opacity-90 transition-all duration-500"
            style={{ background: copy.gradient }}
          />
          <div className="relative p-6 sm:p-8 md:p-9 flex flex-col h-full min-h-[180px] md:min-h-[500px]">
            <div className="flex items-center gap-2.5 mb-5">
              <Image
                src="/logo.png"
                alt="Trading Santai"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="text-sm font-semibold text-white/90">Trading Santai</span>
            </div>

            {insight && (
              <div className="flex-1 flex flex-col">
                <span className="inline-flex self-start px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-accent/20 text-accent border border-accent/25 mb-4">
                  {insight.tag}
                </span>
                <h2
                  id="auth-modal-title"
                  className="text-xl sm:text-2xl font-bold text-white leading-snug mb-4"
                >
                  {insight.title}
                </h2>
                <p className="text-sm sm:text-[15px] text-white/65 leading-relaxed flex-1">
                  {insight.body}
                </p>
                {insight.footnote && (
                  <p className="mt-5 pt-4 border-t border-white/8 text-xs text-white/45 leading-relaxed italic">
                    {insight.footnote}
                  </p>
                )}
              </div>
            )}

            <p className="mt-6 text-[11px] text-white/30 leading-relaxed hidden sm:block">
              {copy.footer}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 md:p-9">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">{copy.title}</h3>
              <p className="text-sm text-white/50">{copy.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isLogin ? (
            <LoginForm
              notice={loginNotice}
              onSuccess={onClose}
              onSwitchToSignup={() => handleModeChange("signup")}
            />
          ) : (
            <SignupForm
              onSuccess={handleSignupSuccess}
              onSwitchToLogin={() => handleModeChange("login")}
            />
          )}
        </div>
      </div>
    </div>
  );
}