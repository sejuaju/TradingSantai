import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

export function createAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Cek apakah email sudah terdaftar. null = tidak bisa dicek server-side. */
export async function emailIsRegistered(email: string): Promise<boolean | null> {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!url || !serviceKey) {
    console.error("[auth] email check skipped: missing SUPABASE_URL or SERVICE_ROLE_KEY");
    return null;
  }

  const normalized = email.trim().toLowerCase();

  try {
    const admin = createAdminClient();
    if (!admin) return null;

    let page = 1;
    const perPage = 200;

    while (page <= 10) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("[auth] listUsers failed:", error.message, error.code);
        return null;
      }

      if (data.users.some((u) => u.email?.toLowerCase() === normalized)) {
        return true;
      }
      if (data.users.length < perPage) return false;
      page++;
    }

    return false;
  } catch (err) {
    console.error("[auth] email check error:", err);
    return null;
  }
}