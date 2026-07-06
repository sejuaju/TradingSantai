/** URL redirect untuk link email Supabase (konfirmasi & reset password). */
export function getSupabaseAuthRedirectUrl(path: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";
  return `${site.replace(/\/$/, "")}${path}`;
}