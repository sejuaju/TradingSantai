"use client";

import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { getAvatarUrl, getInitials } from "@/lib/profile";

const SIZES = {
  sm: { box: "w-6 h-6", text: "text-[9px]", img: 24 },
  md: { box: "w-7 h-7", text: "text-[10px]", img: 28 },
  lg: { box: "w-9 h-9", text: "text-xs", img: 36 },
  xl: { box: "w-20 h-20", text: "text-lg", img: 80 },
} as const;

interface UserAvatarProps {
  user: User;
  displayName: string;
  size?: keyof typeof SIZES;
  showStatus?: boolean;
  className?: string;
}

export default function UserAvatar({
  user,
  displayName,
  size = "md",
  showStatus = false,
  className = "",
}: UserAvatarProps) {
  const avatarUrl = getAvatarUrl(user);
  const initials = getInitials(displayName);
  const s = SIZES[size];

  return (
    <div className={`relative shrink-0 ${className}`}>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={displayName}
          width={s.img}
          height={s.img}
          unoptimized
          className={`${s.box} rounded-full object-cover border border-white/10 shadow-md shadow-accent/10`}
        />
      ) : (
        <div
          className={`${s.box} rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center font-bold text-white shadow-md shadow-accent/20 ${s.text}`}
        >
          {initials}
        </div>
      )}
      {showStatus && (
        <span className="absolute -bottom-px -right-px w-2 h-2 rounded-full bg-emerald-400 border border-[#252525]" />
      )}
    </div>
  );
}