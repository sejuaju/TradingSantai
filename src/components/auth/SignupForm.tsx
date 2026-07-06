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
  authFieldClass,
} from "./authUi";

interface SignupFormProps {
  onSuccess?: (needsEmailConfirm: boolean) => void;
  onSwitchToLogin?: () => void;
}

export default function SignupForm({ onSuccess, onSwitchToLogin }: SignupFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  function validateFields(): boolean {
    if (!name.trim()) {
      setError("Nama wajib diisi.");
      return false;
    }

    const emailValidation = validateEmail(email);
    setEmailError(emailValidation);
    if (emailValidation) {
      setError(emailValidation);
      return false;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return false;
    }

    if (password !== confirmPassword) {
      const mismatchMsg = "Password dan konfirmasi password tidak sama.";
      setConfirmPasswordError(mismatchMsg);
      setError(mismatchMsg);
      return false;
    }

    setConfirmPasswordError(null);
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEmailError(null);
    setConfirmPasswordError(null);

    if (!validateFields()) return;

    setLoading(true);

    const supabase = createClient();
    if (!supabase) {
      setError("Layanan pendaftaran sementara tidak tersedia. Coba lagi nanti.");
      setLoading(false);
      return;
    }

    try {
      const trimmedName = name.trim();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: trimmedName, name: trimmedName },
          emailRedirectTo: getSupabaseAuthRedirectUrl("/auth/supabase/callback"),
        },
      });
      if (signUpError) throw signUpError;
      setConfirmPassword("");
      const needsEmailConfirm = !!data.user && !data.session;
      onSuccess?.(needsEmailConfirm);
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

  function handleConfirmPasswordBlur() {
    if (!confirmPassword) return;
    setConfirmPasswordError(
      password !== confirmPassword ? "Password dan konfirmasi password tidak sama." : null,
    );
  }

  return (
    <form onSubmit={handleSubmit} className={AUTH_FORM_CLASS} noValidate>
      <div>
        <label htmlFor="signup-name" className={AUTH_LABEL_CLASS}>
          Nama
        </label>
        <input
          id="signup-name"
          type="text"
          minLength={2}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={authFieldClass(false)}
          placeholder="Nama lengkap"
        />
      </div>

      <div>
        <label htmlFor="signup-email" className={AUTH_LABEL_CLASS}>
          Email
        </label>
        <input
          id="signup-email"
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
        <label htmlFor="signup-password" className={AUTH_LABEL_CLASS}>
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={authFieldClass(false)}
          placeholder="Minimal 6 karakter"
        />
      </div>

      <div>
        <label htmlFor="signup-confirm" className={AUTH_LABEL_CLASS}>
          Konfirmasi Password
        </label>
        <input
          id="signup-confirm"
          type="password"
          minLength={6}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (confirmPasswordError && e.target.value === password) {
              setConfirmPasswordError(null);
            }
          }}
          onBlur={handleConfirmPasswordBlur}
          className={authFieldClass(!!confirmPasswordError)}
          placeholder="Ulangi password"
        />
        {confirmPasswordError && (
          <p className="mt-1.5 text-xs text-red-400">{confirmPasswordError}</p>
        )}
      </div>

      {error && !emailError && !confirmPasswordError && (
        <p className={AUTH_ERROR_CLASS}>{error}</p>
      )}

      <button type="submit" disabled={loading} className={AUTH_SUBMIT_CLASS}>
        {loading ? "Memproses..." : "Buat Akun"}
      </button>

      <p className="text-center text-sm text-white/50 pt-1">
        Sudah punya akun?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-accent hover:text-accent-dark font-medium cursor-pointer"
        >
          Login
        </button>
      </p>
    </form>
  );
}