"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateEmail } from "@/lib/validateEmail";
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

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (signInError) throw signInError;
      onSuccess?.();
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan. Coba lagi.");
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
        <label htmlFor="login-password" className={AUTH_LABEL_CLASS}>
          Password
        </label>
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