export function mapLoginError(
  message: string,
  emailExists: boolean | null,
): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials")
  ) {
    if (emailExists === false) {
      return "Akun tidak ditemukan. Email ini belum terdaftar — silakan Sign Up.";
    }
    if (emailExists === true) {
      return "Password salah. Periksa kembali password kamu.";
    }
    return "Email atau password tidak sesuai. Jika belum punya akun, silakan Sign Up.";
  }

  if (lower.includes("email not confirmed")) {
    return "Email belum dikonfirmasi. Cek inbox kamu untuk link verifikasi.";
  }

  if (lower.includes("too many requests")) {
    return "Terlalu banyak percobaan login. Tunggu beberapa menit lalu coba lagi.";
  }

  return message;
}