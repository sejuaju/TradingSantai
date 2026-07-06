/** Origin situs untuk redirect email Supabase (konfirmasi & reset password). */
function resolveSiteOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  const saxoUri = process.env.NEXT_PUBLIC_SAXO_REDIRECT_URI;
  if (saxoUri) {
    try {
      return new URL(saxoUri).origin;
    } catch {
      /* ignore invalid URL */
    }
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3001";
}

/** URL redirect untuk link email Supabase (konfirmasi & reset password). */
export function getSupabaseAuthRedirectUrl(path: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return `${resolveSiteOrigin()}${path}`;
}