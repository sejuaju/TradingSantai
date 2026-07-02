"use client";

import AuthTrigger from "./AuthTrigger";

interface SignupButtonProps {
  children: React.ReactNode;
  className?: string;
}

/** Tombol Sign Up untuk dipakai di server components (CTA, Services, dll.) */
export default function SignupButton({ children, className }: SignupButtonProps) {
  return (
    <AuthTrigger mode="signup" className={className}>
      {children}
    </AuthTrigger>
  );
}