"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/validateEmail";
import ForgotPasswordForm from "./ForgotPasswordForm";
import {
  AUTH_ERROR_CLASS,
  AUTH_FORM_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_SUBMIT_CLASS,
  AUTH_SUCCESS_CLASS,
  authFieldClass,
} from "./authUi";

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToSignup?: () => void;
  notice?: string | null;
}

export default function LoginForm({ onSuccess, onSwitchToSignup, notice }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showForgot, setShowForgot] = useState(false);

  if (showForgot) {
    return <ForgotPasswordForm onBack={() => setShowForgot(false)} />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(null);

    const emailValidation = validateEmail(email);
    setEmailError(emailValidation);
    if (emailValidation) {
      setError(emailValidation);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setError("Layanan login sementara tidak tersedia. Coba lagi nanti.");
      setLoading(false);
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const loginData = (await loginRes.json()) as {
        error?: string;
        access_token?: string;
        refresh_token?: string;
      };

      if (!loginRes.ok || loginData.error) {
        setError(loginData.error ?? "Gagal login. Periksa email dan password kamu.");
        return;
      }

      if (!loginData.access_token || !loginData.refresh_token) {
        setError("Gagal login. Periksa email dan password kamu.");
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: loginData.access_token,
        refresh_token: loginData.refresh_token,
      });

      if (sessionError) {
        setError("Login berhasil tetapi sesi gagal disimpan. Coba login lagi.");
        return;
      }

      onSuccess?.();
      router.push("/");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function handleEmailBlur() {
    if (!email.trim()) return;
    setEmailError(validateEmail(email));
  }

  return (
    <form onSubmit={handleSubmit} className={AUTH_FORM_CLASS} noValidate>
      {notice && <p className={AUTH_SUCCESS_CLASS}>{notice}</p>}

      <div>
        <label htmlFor="login-email" className={AUTH_LABEL_CLASS}>
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          onBlur={handleEmailBlur}
          className={authFieldClass(!!emailError)}
          placeholder="nama@gmail.com"
        />
        {emailError && <p className="mt-1.5 text-xs text-red-400">{emailError}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="login-password" className={AUTH_LABEL_CLASS + " mb-0"}>
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowForgot(true)}
            className="text-[11px] text-accent hover:text-accent-dark cursor-pointer"
          >
            Lupa password?
          </button>
        </div>
        <input
          id="login-password"
          type="password"
          minLength={6}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={authFieldClass(false)}
          placeholder="Password kamu"
        />
      </div>

      {error && !emailError && <p className={AUTH_ERROR_CLASS}>{error}</p>}

      <button type="submit" disabled={loading} className={AUTH_SUBMIT_CLASS}>
        {loading ? "Memproses..." : "Login"}
      </button>

      <p className="text-center text-sm text-white/50 pt-1">
        Belum punya akun?{" "}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="text-accent hover:text-accent-dark font-medium cursor-pointer"
        >
          Sign Up
        </button>
      </p>
    </form>
  );
}