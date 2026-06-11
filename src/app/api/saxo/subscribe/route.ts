import { NextRequest, NextResponse } from "next/server";

const SAXO_API_URL = process.env.NEXT_PUBLIC_SAXO_ENVIRONMENT === "LIVE"
  ? "https://gateway.saxobank.com/openapi"
  : "https://gateway.saxobank.com/sim/openapi";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, uic, assetType, contextId } = body;

    if (!accessToken || !uic || !assetType || !contextId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Create price subscription for Chart v3
    const subscriptionBody = {
      ContextId: contextId,
      ReferenceId: `chart_${uic}_${Date.now()}`,
      Arguments: {
        Uic: parseInt(uic),
        AssetType: assetType,
        Horizon: 1, // 1 minute for real-time updates
      },
    };

    const url = `${SAXO_API_URL}/chart/v3/charts/subscriptions`;

    console.log("[Saxo Subscribe] Creating subscription:", url);
    console.log("[Saxo Subscribe] Body:", JSON.stringify(subscriptionBody, null, 2));

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

    const data = await response.json();
    console.log("[Saxo Subscribe] Success:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Saxo Subscribe] Exception:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE method to remove subscription
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, contextId, referenceId } = body;

    if (!accessToken || !contextId || !referenceId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const url = `${SAXO_API_URL}/chart/v3/charts/subscriptions/${contextId}/${referenceId}`;

    console.log("[Saxo Unsubscribe] Deleting:", url);

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Saxo Unsubscribe] Error:", response.status, errorText);
      return NextResponse.json(
        { error: `Saxo API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    console.log("[Saxo Unsubscribe] Success");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Saxo Unsubscribe] Exception:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
