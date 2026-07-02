export interface AuthErrorLike {
  message?: string;
  code?: string;
  status?: number;
}

export function mapLoginError(
  error: AuthErrorLike,
  emailExists: boolean | null,
): string {
  const code = (error.code ?? "").toLowerCase();
  const message = (error.message ?? "").toLowerCase();

  const isInvalidCredentials =
    code === "invalid_credentials" ||
    code === "invalid_grant" ||
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials");

  if (isInvalidCredentials) {
    if (emailExists === false) {
      return "Akun tidak ditemukan. Email ini belum terdaftar. Silakan Sign Up.";
    }
    if (emailExists === true) {
      return "Password salah. Periksa kembali password kamu.";
    }
    return "Email atau password tidak sesuai. Jika belum punya akun, silakan Sign Up.";
  }

  if (message.includes("email not confirmed") || code === "email_not_confirmed") {
    return "Email belum dikonfirmasi. Cek inbox kamu untuk link verifikasi.";
  }

  if (message.includes("too many requests") || code === "over_request_rate_limit") {
    return "Terlalu banyak percobaan login. Tunggu beberapa menit lalu coba lagi.";
  }

  return "Gagal login. Periksa email dan password kamu, lalu coba lagi.";
}