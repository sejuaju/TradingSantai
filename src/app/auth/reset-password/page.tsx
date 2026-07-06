"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AUTH_ERROR_CLASS,
  AUTH_FORM_CLASS,
  AUTH_LABEL_CLASS,
  AUTH_SUBMIT_CLASS,
  AUTH_SUCCESS_CLASS,
  authFieldClass,
} from "@/components/auth/authUi";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [sessionOk, setSessionOk] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
      if (!supabase) {
        setError("Layanan tidak tersedia.");
        setReady(true);
        return;
      }

      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError("Link reset tidak valid atau sudah kadaluarsa. Minta link baru dari halaman login.");
          setReady(true);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSessionOk(!!session);
      if (!session) {
        setError("Sesi reset tidak ditemukan. Buka link dari email reset password kamu.");
      }
      setReady(true);
    }

    init();
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Password dan konfirmasi tidak sama.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setError("Layanan tidak tersedia.");
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => router.push("/"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[#05060c]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0b14] p-8 shadow-2xl">
        <h1 className="text-xl font-bold text-white mb-1">Password Baru</h1>
        <p className="text-sm text-white/50 mb-6">
          Buat password baru untuk akun Trading Santai kamu.
        </p>

        {!ready && (
          <p className="text-sm text-white/50">Memverifikasi link...</p>
        )}

        {ready && done && (
          <p className={AUTH_SUCCESS_CLASS}>
            Password berhasil diubah. Mengalihkan ke beranda...
          </p>
        )}

        {ready && !done && sessionOk && (
          <form onSubmit={handleSubmit} className={AUTH_FORM_CLASS} noValidate>
            <div>
              <label htmlFor="new-password" className={AUTH_LABEL_CLASS}>
                Password Baru
              </label>
              <input
                id="new-password"
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
              <label htmlFor="confirm-password" className={AUTH_LABEL_CLASS}>
                Konfirmasi Password
              </label>
              <input
                id="confirm-password"
                type="password"
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={authFieldClass(false)}
                placeholder="Ulangi password"
              />
            </div>
            {error && <p className={AUTH_ERROR_CLASS}>{error}</p>}
            <button type="submit" disabled={loading} className={AUTH_SUBMIT_CLASS}>
              {loading ? "Menyimpan..." : "Simpan Password"}
            </button>
          </form>
        )}

        {ready && !done && !sessionOk && error && (
          <div className={AUTH_FORM_CLASS}>
            <p className={AUTH_ERROR_CLASS}>{error}</p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className={AUTH_SUBMIT_CLASS}
            >
              Ke Beranda
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#05060c] text-white/50 text-sm">
        Memuat...
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}