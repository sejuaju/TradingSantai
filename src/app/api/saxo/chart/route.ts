import { NextRequest, NextResponse } from "next/server";

const SAXO_API_URL = process.env.NEXT_PUBLIC_SAXO_ENVIRONMENT === "LIVE"
  ? "https://gateway.saxobank.com/openapi"
  : "https://gateway.saxobank.com/sim/openapi";

// GET handler for testing
export async function GET() {
  return NextResponse.json({ 
    message: "Saxo Chart API endpoint is working",
    method: "Use POST to fetch chart data" 
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, uic, assetType, horizon, count, mode = "UpTo", time, accountKey } = body;

    console.log("[Saxo Chart API] Request params:", { 
      uic, 
      assetType, 
      horizon, 
      count,
      mode,
      time,
      hasAccountKey: !!accountKey,
      hasToken: !!accessToken 
    });

    if (!accessToken || !uic || !assetType || !horizon || !count || !accountKey) {
      return NextResponse.json(
        { error: "Missing required parameters (accessToken, uic, assetType, horizon, count, accountKey)" },
        { status: 400 }
      );
    }

    // Build query parameters for GET request - Chart v3 requires AccountKey
    const params = new URLSearchParams({
      AccountKey: accountKey,
      AssetType: assetType,
      Uic: uic.toString(),
      Horizon: horizon.toString(),
      Count: count.toString(),
      Mode: mode,
    });

    // Time is required when using From or UpTo mode
    if (time) {
      params.append("Time", time);
    }

    // Use v3 endpoint with GET method (based on official Saxo documentation)
    const url = `${SAXO_API_URL}/chart/v3/charts?${params.toString()}`;
    
    console.log("[Saxo Chart API] Calling:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    console.log("[Saxo Chart API] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Saxo Chart API] Error response:", errorText.substring(0, 500));
      return NextResponse.json(
        { error: `Saxo API error: ${response.status}`, details: errorText.substring(0, 200) },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[Saxo Chart API] Success, data points:", data.Data?.length || 0);
    
    // Log first data point to see structure
    if (data.Data && data.Data.length > 0) {
      console.log("[Saxo Chart API] Sample data point:", JSON.stringify(data.Data[0]));
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Saxo Chart API] Exception:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
