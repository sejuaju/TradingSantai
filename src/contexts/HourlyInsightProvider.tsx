"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";
import HourlyInsightPopup from "@/components/insights/HourlyInsightPopup";
import {
  HOURLY_INTERVAL_MS,
  initHourlyInsight,
  msUntilNextInsight,
  setLastShown,
  shouldShowHourlyInsight,
} from "@/lib/hourlyInsight";

interface HourlyInsightContextValue {
  dismissInsight: () => void;
}

const HourlyInsightContext = createContext<HourlyInsightContextValue | null>(null);

export function HourlyInsightProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { isOpen: authOpen } = useAuthModal();
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userId = user?.id ?? null;

  const clearScheduled = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const tryOpen = useCallback(() => {
    if (!userId || authOpen) return;
    setOpen(true);
  }, [userId, authOpen]);

  const scheduleNext = useCallback(() => {
    clearScheduled();
    if (!userId) return;

    const delay = msUntilNextInsight(userId);
    timeoutRef.current = setTimeout(() => {
      tryOpen();
    }, delay > 0 ? delay : HOURLY_INTERVAL_MS);
  }, [userId, clearScheduled, tryOpen]);

  const dismissInsight = useCallback(() => {
    setOpen(false);
    if (userId) setLastShown(userId);
    scheduleNext();
  }, [userId, scheduleNext]);

  useEffect(() => {
    if (loading) return;

    if (!userId) {
      setOpen(false);
      clearScheduled();
      return;
    }

    initHourlyInsight(userId);

    if (shouldShowHourlyInsight(userId)) {
      tryOpen();
    } else {
      scheduleNext();
    }

    return clearScheduled;
  }, [userId, loading, clearScheduled, scheduleNext, tryOpen]);

  useEffect(() => {
    if (authOpen) setOpen(false);
  }, [authOpen]);

  useEffect(() => {
    const uid = userId;
    if (!uid) return;

    function onVisible() {
      if (document.visibilityState !== "visible" || !uid) return;
      if (shouldShowHourlyInsight(uid) && !authOpen) {
        setOpen(true);
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [userId, authOpen]);

  const value = { dismissInsight };

  return (
    <HourlyInsightContext.Provider value={value}>
      {children}
      {open && userId && !authOpen && (
        <HourlyInsightPopup onDismiss={dismissInsight} />
      )}
    </HourlyInsightContext.Provider>
  );
}

export function useHourlyInsight() {
  const ctx = useContext(HourlyInsightContext);
  if (!ctx) {
    throw new Error("useHourlyInsight must be used within HourlyInsightProvider");
  }
  return ctx;
}