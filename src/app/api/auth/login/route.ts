import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { mapLoginError } from "@/lib/authErrors";
import { emailIsRegistered } from "@/lib/supabase/admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { validateEmail } from "@/lib/validateEmail";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    const emailValidation = validateEmail(email);
    if (emailValidation) {
      return NextResponse.json({ error: emailValidation }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ error: "Password wajib diisi." }, { status: 400 });
    }

    const url = getSupabaseUrl();
    const anonKey = getSupabaseAnonKey();
    if (!url || !anonKey) {
      return NextResponse.json(
        { error: "Layanan login sementara tidak tersedia. Coba lagi nanti." },
        { status: 503 },
      );
    }

    const exists = await emailIsRegistered(email);

    if (exists === false) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan. Email ini belum terdaftar — silakan Sign Up." },
        { status: 404 },
      );
    }

    const supabase = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      return NextResponse.json(
        {
          error: mapLoginError(
            { message: error?.message, code: error?.code, status: error?.status },
            exists,
          ),
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch {
    return NextResponse.json(
      { error: "Terjadi kesalahan. Coba lagi." },
      { status: 500 },
    );
  }
}