import type { SupabaseClient } from "@supabase/supabase-js";
import type { Signal } from "@/components/terminal/types";
import { TRADING_CONFIG } from "@/components/terminal/config";

interface PositionRow {
  user_id: string;
  instrument_id: string;
  position_type: "BUY" | "SELL";
  price: number;
  sl: number;
  tp: number;
  rsi: number;
  reason: string;
  signal_time: number;
  status: "active" | "win" | "loss";
  close_price: number | null;
  close_time: number | null;
  entry_timeframe: string;
}

function signalToRow(userId: string, signal: Signal): PositionRow {
  return {
    user_id: userId,
    instrument_id: signal.instrumentId ?? "",
    position_type: signal.type,
    price: signal.price,
    sl: signal.sl,
    tp: signal.tp,
    rsi: signal.rsi,
    reason: signal.reason,
    signal_time: signal.time,
    status: signal.status,
    close_price: signal.closePrice ?? null,
    close_time: signal.closeTime ?? null,
    entry_timeframe: signal.entryTimeframe ?? "",
  };
}

function rowToSignal(row: PositionRow & { user_id: string }): Signal {
  return {
    type: row.position_type,
    price: row.price,
    sl: row.sl,
    tp: row.tp,
    rsi: row.rsi,
    reason: row.reason,
    time: row.signal_time,
    status: row.status,
    instrumentId: row.instrument_id || undefined,
    userId: row.user_id,
    closePrice: row.close_price ?? undefined,
    closeTime: row.close_time ?? undefined,
    entryTimeframe: row.entry_timeframe || undefined,
  };
}

export async function fetchUserPositions(
  supabase: SupabaseClient,
  userId: string,
): Promise<Signal[]> {
  const { data, error } = await supabase
    .from("user_positions")
    .select("*")
    .eq("user_id", userId)
    .order("signal_time", { ascending: false })
    .limit(TRADING_CONFIG.MAX_SIGNALS_HISTORY);

  if (error) {
    if (error.message.includes("does not exist") || error.code === "42P01") {
      throw new Error("TABLE_MISSING");
    }
    throw error;
  }

  return (data as PositionRow[]).map((row) => rowToSignal({ ...row, user_id: userId }));
}

export async function syncUserPositions(
  supabase: SupabaseClient,
  userId: string,
  signals: Signal[],
): Promise<void> {
  const scoped = signals
    .filter((s) => s.userId === userId)
    .slice(0, TRADING_CONFIG.MAX_SIGNALS_HISTORY);

  if (scoped.length === 0) {
    const { error } = await supabase.from("user_positions").delete().eq("user_id", userId);
    if (error && error.code !== "42P01") throw error;
    return;
  }

  const rows = scoped.map((s) => signalToRow(userId, s));

  const { error: upsertError } = await supabase
    .from("user_positions")
    .upsert(rows, { onConflict: "user_id,signal_time,instrument_id,position_type" });

  if (upsertError) {
    if (upsertError.message.includes("does not exist") || upsertError.code === "42P01") {
      throw new Error("TABLE_MISSING");
    }
    throw upsertError;
  }

  const keepKeys = new Set(
    scoped.map((s) => `${s.time}|${s.instrumentId ?? ""}|${s.type}`),
  );

  const { data: existing, error: fetchError } = await supabase
    .from("user_positions")
    .select("signal_time, instrument_id, position_type")
    .eq("user_id", userId);

  if (fetchError) throw fetchError;

  const stale = (existing ?? []).filter(
    (row) => !keepKeys.has(`${row.signal_time}|${row.instrument_id ?? ""}|${row.position_type}`),
  );

  if (stale.length > 0) {
    await Promise.all(
      stale.map((row) =>
        supabase
          .from("user_positions")
          .delete()
          .eq("user_id", userId)
          .eq("signal_time", row.signal_time)
          .eq("instrument_id", row.instrument_id ?? "")
          .eq("position_type", row.position_type),
      ),
    );
  }
}