"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SupabaseCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Memverifikasi email...");

  useEffect(() => {
    async function handle() {
      const code = searchParams.get("code");
      const supabase = createClient();

      if (!supabase || !code) {
        setMessage("Link verifikasi tidak valid.");
        setTimeout(() => router.push("/"), 3000);
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setMessage("Verifikasi gagal atau link sudah kadaluarsa.");
        setTimeout(() => router.push("/"), 3000);
        return;
      }

      setMessage("Email berhasil dikonfirmasi! Mengalihkan...");
      setTimeout(() => router.push("/"), 1500);
    }

    handle();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05060c] px-4">
      <p className="text-sm text-white/60 font-mono">{message}</p>
    </div>
  );
}

export default function SupabaseCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#05060c] text-white/50 text-sm">
        Memuat...
      </div>
    }>
      <SupabaseCallbackContent />
    </Suspense>
  );
}