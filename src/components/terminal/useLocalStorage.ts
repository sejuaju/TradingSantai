/**
 * useLocalStorage Hook
 * Persist data to localStorage with type safety
 */

import { useState, useEffect } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);
      // Parse stored json or if none return initialValue
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to localStorage.
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setStoredValue(valueToStore);
      // Save to local storage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

/**
 * Hook to persist signals to localStorage
 */
import { Signal } from "./types";

export function usePersistedSignals() {
  const [signals, setSignals] = useLocalStorage<Signal[]>("tradingsantai_signals", []);
  
  // Clear old signals (older than 7 days)
  useEffect(() => {
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    setSignals((prev) => {
      const filtered = prev.filter((s) => {
        const signalTime = s.time || s.closeTime || 0;
        return now - signalTime < SEVEN_DAYS;
      });
      
      // Only update if something was removed
      return filtered.length !== prev.length ? filtered : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - setSignals is stable
  
  return [signals, setSignals] as const;
}

/**
 * Hook to persist user preferences
 */
export interface UserPreferences {
  selectedTimeframe: string;
  autoMode: boolean;
  leverage: number;
  riskMode: string;
}

export function usePersistedPreferences() {
  const defaultPrefs: UserPreferences = {
    selectedTimeframe: "15m",
    autoMode: false,
    leverage: 10,
    riskMode: "NORMAL",
  };
  
  return useLocalStorage("tradingsantai_preferences", defaultPrefs);
}
