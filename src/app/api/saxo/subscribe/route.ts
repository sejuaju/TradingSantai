import { NextRequest, NextResponse } from "next/server";

const SAXO_API_URL = process.env.NEXT_PUBLIC_SAXO_ENVIRONMENT === "LIVE"
  ? "https://gateway.saxobank.com/openapi"
  : "https://gateway.saxobank.com/sim/openapi";

/**
 * POST — Buat chart subscription untuk WebSocket streaming
 * Harus dipanggil SETELAH WebSocket sudah terconnect
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, uic, assetType, contextId, referenceId, horizon, accountKey } = body;

    if (!accessToken || !uic || !assetType || !contextId || !referenceId || !accountKey) {
      return NextResponse.json(
        { error: "Missing required parameters", required: ["accessToken","uic","assetType","contextId","referenceId","accountKey"] },
        { status: 400 }
      );
    }

    const subscriptionBody = {
      ContextId: contextId,
      ReferenceId: referenceId,
      Arguments: {
        AccountKey: accountKey,
        Uic: Number(uic),
        AssetType: assetType,
        Horizon: horizon || 15,
        Count: 1,           // Hanya butuh 1 candle terbaru untuk update real-time
        Mode: "UpTo",
        Time: new Date().toISOString(),
      },
    };

    const url = `${SAXO_API_URL}/chart/v3/charts/subscriptions`;

    console.log("[Saxo Subscribe] Creating subscription:", { contextId, referenceId, uic, assetType });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Saxo Subscribe] Error:", response.status, errorText);
      return NextResponse.json(
        { error: `Saxo API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    // 201 Created — Location header berisi URL untuk unsubscribe nanti
    const locationHeader = response.headers.get("Location");
    let data = {};
    try {
      data = await response.json();
    } catch {
      // 201 mungkin tidak ada body
    }

    console.log("[Saxo Subscribe] ✅ Success, referenceId:", referenceId, "location:", locationHeader);

    return NextResponse.json(
      { ...data, referenceId, location: locationHeader },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Saxo Subscribe] Exception:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Hapus subscription tertentu
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, contextId, referenceId } = body;

    if (!accessToken || !contextId || !referenceId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const url = `${SAXO_API_URL}/chart/v3/charts/subscriptions/${contextId}/${referenceId}`;

    console.log("[Saxo Unsubscribe]", url);

    const response = await fetch(url, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Saxo API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
