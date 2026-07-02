const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const KNOWN_MAIL_PROVIDERS = new Set([
  "gmail",
  "yahoo",
  "hotmail",
  "outlook",
  "icloud",
  "live",
  "msn",
]);

const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  "gmail.co": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cim": "gmail.com",
  "gmail.comm": "gmail.com",
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "yahoo.co": "yahoo.com",
  "yaho.com": "yahoo.com",
  "hotmail.co": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "outlook.co": "outlook.com",
};

export function validateEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();

  if (!email) {
    return "Email wajib diisi.";
  }

  if (!EMAIL_REGEX.test(email)) {
    return "Format email tidak valid. Contoh: nama@gmail.com";
  }

  const atIndex = email.lastIndexOf("@");
  const domain = email.slice(atIndex + 1);

  if (COMMON_DOMAIN_TYPOS[domain]) {
    return `Email tidak valid. Maksud Anda @${COMMON_DOMAIN_TYPOS[domain]}?`;
  }

  const parts = domain.split(".");
  const provider = parts[0];
  const tld = parts[parts.length - 1];

  if (parts.length < 2 || tld.length < 2) {
    return "Domain email tidak valid.";
  }

  if (
    parts.length === 2 &&
    KNOWN_MAIL_PROVIDERS.has(provider) &&
    tld.length < 3
  ) {
    return `Domain @${domain} tidak valid. Periksa kembali (mis. ${provider}.com).`;
  }

  return null;
}