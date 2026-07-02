"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { createClient } from "@/lib/supabase/client";
import { getAvatarUrl, getDisplayName, getInitials, uploadAvatar } from "@/lib/profile";
import { authFieldClass } from "./authUi";

export default function ProfileForm() {
  const router = useRouter();
  const { openLogin } = useAuthModal();
  const { user, loading } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) openLogin();
  }, [user, loading, openLogin]);

  useEffect(() => {
    if (!user) return;
    setName(getDisplayName(user));
    setPreviewUrl(getAvatarUrl(user));
  }, [user]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05060c]">
        <Loader2 className="w-6 h-6 text-accent animate-spin" />
      </div>
    );
  }

  const displayName = getDisplayName(user);
  const initials = getInitials(name || displayName);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSelectedFile(file);
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }

    const supabase = createClient();
    if (!supabase || !user) {
      setError("Layanan profil sementara tidak tersedia. Coba lagi nanti.");
      return;
    }

    const userId = user.id;
    setSaving(true);
    try {
      let avatarUrl = getAvatarUrl(user);

      if (selectedFile) {
        avatarUrl = await uploadAvatar(supabase, userId, selectedFile);
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          name: trimmedName,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        },
      });

      if (updateError) throw updateError;

      setSelectedFile(null);
      setPreviewUrl(avatarUrl);
      setMessage("Profil berhasil diperbarui.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-[#05060c]">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-white/50 hover:text-white mb-6 transition-colors cursor-pointer"
        >
          ← Kembali ke beranda
        </Link>

        <div className="rounded-2xl border border-white/8 bg-[#0a0b14] p-8 shadow-2xl shadow-black/40">
          <h1 className="text-2xl font-bold text-white mb-1">Edit Profil</h1>
          <p className="text-sm text-white/50 mb-6">
            Perbarui nama dan foto profil akun Trading Santai kamu.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative group cursor-pointer"
                aria-label="Ubah foto profil"
              >
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt="Foto profil"
                    width={80}
                    height={80}
                    unoptimized
                    className="w-20 h-20 rounded-full object-cover border-2 border-white/10 group-hover:border-accent/40 transition-colors"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-lg font-bold text-white border-2 border-white/10 group-hover:border-accent/40 transition-colors">
                    {initials}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent flex items-center justify-center border-2 border-[#0a0b14] shadow-lg">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-xs text-white/40 text-center">
                Klik foto untuk upload. JPG, PNG, WEBP — maks. 2 MB.
              </p>
            </div>

            <div>
              <label htmlFor="profile-name" className="block text-xs font-medium text-white/60 mb-1.5">
                Nama
              </label>
              <input
                id="profile-name"
                type="text"
                minLength={2}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={authFieldClass(false)}
                placeholder="Nama lengkap"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Email</label>
              <input
                type="email"
                value={user.email ?? ""}
                disabled
                className={`${authFieldClass(false)} opacity-50 cursor-not-allowed`}
              />
              <p className="mt-1 text-[10px] text-white/35">Email tidak bisa diubah dari sini.</p>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {message && (
              <p className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 text-sm font-semibold text-white bg-accent hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}