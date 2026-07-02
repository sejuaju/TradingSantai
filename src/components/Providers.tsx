"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import { HourlyInsightProvider } from "@/contexts/HourlyInsightProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthModalProvider>
        <HourlyInsightProvider>{children}</HourlyInsightProvider>
      </AuthModalProvider>
    </AuthProvider>
  );
}