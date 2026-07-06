"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getSupabaseAuthRedirectUrl } from "@/lib/authRedirect";
import { validateEmail } from "@/lib/validateEmail";
import {
  AUTH_ERROR_CLASS,
  AUTH_FORM_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_SUBMIT_CLASS,
  AUTH_SUCCESS_CLASS,
  authFieldClass,
} from "./authUi";

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export default function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(null);

    const emailValidation = validateEmail(email);
    setEmailError(emailValidation);
    if (emailValidation) return;

    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setError("Layanan sementara tidak tersedia. Coba lagi nanti.");
      setLoading(false);
      return;
    }

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: getSupabaseAuthRedirectUrl("/auth/reset-password") },
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim link reset. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className={AUTH_FORM_CLASS}>
        <p className={AUTH_SUCCESS_CLASS}>
          Link reset password sudah dikirim ke <strong>{email.trim().toLowerCase()}</strong>.
          Cek inbox (dan folder spam), lalu klik link untuk membuat password baru.
        </p>
        <button type="button" onClick={onBack} className={AUTH_SUBMIT_CLASS}>
          Kembali ke Login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={AUTH_FORM_CLASS} noValidate>
      <p className="text-sm text-white/55 leading-relaxed">
        Masukkan email akun kamu. Kami akan kirim link untuk mengatur ulang password.
      </p>

      <div>
        <label htmlFor="forgot-email" className={AUTH_LABEL_CLASS}>
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          className={authFieldClass(!!emailError)}
          placeholder="nama@gmail.com"
        />
        {emailError && <p className="mt-1.5 text-xs text-red-400">{emailError}</p>}
      </div>

      {error && !emailError && <p className={AUTH_ERROR_CLASS}>{error}</p>}

      <button type="submit" disabled={loading} className={AUTH_SUBMIT_CLASS}>
        {loading ? "Mengirim..." : "Kirim Link Reset"}
      </button>

      <p className="text-center text-sm text-white/50 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="text-accent hover:text-accent-dark font-medium cursor-pointer"
        >
          ← Kembali ke Login
        </button>
      </p>
    </form>
  );
}