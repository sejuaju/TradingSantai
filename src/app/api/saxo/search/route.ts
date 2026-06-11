import { NextRequest, NextResponse } from "next/server";

const SAXO_API_URL = process.env.NEXT_PUBLIC_SAXO_ENVIRONMENT === "LIVE"
  ? "https://gateway.saxobank.com/openapi"
  : "https://gateway.saxobank.com/sim/openapi";

/**
 * Search for instruments and get their UIC
 * This helps find the correct UIC for instruments in your account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, keywords, assetType, limit = 25 } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 400 }
      );
    }

    // Search for instruments using Reference Data API
    const params = new URLSearchParams({
      Keywords: keywords || "",
      AssetTypes: assetType || "FxSpot",
      $top: limit.toString(),
    });

    const url = `${SAXO_API_URL}/ref/v1/instruments?${params.toString()}`;
    
    console.log("[Saxo Search API] Searching:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("[Saxo Search API] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Saxo Search API] Error response:", errorText.substring(0, 500));
      return NextResponse.json(
        { error: `Saxo API error: ${response.status}`, details: errorText.substring(0, 200) },
        { status: response.status }
      );
    }

    let data = await response.json();

    // Fallback: jika 0 hasil dengan AssetType spesifik, coba lagi tanpa filter AssetType
    if ((!data.Data || data.Data.length === 0) && assetType) {
      console.log(`[Saxo Search API] 0 results for AssetType=${assetType}, retrying without AssetType filter...`);
      const broadParams = new URLSearchParams({
        Keywords: keywords || "",
        $top: limit.toString(),
      });
      const broadUrl = `${SAXO_API_URL}/ref/v1/instruments?${broadParams.toString()}`;
      const broadResponse = await fetch(broadUrl, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });
      if (broadResponse.ok) {
        data = await broadResponse.json();
        console.log(`[Saxo Search API] Broad search found: ${data.Data?.length || 0} instruments`);
      }
    }
    console.log("[Saxo Search API] Success, instruments found:", data.Data?.length || 0);
    
    // Return simplified data with UIC, symbol, and description
    const instruments = data.Data?.map((item: {
      Identifier: number;
      Symbol: string;
      Description: string;
      AssetType: string;
      Tradable: boolean;
    }) => ({
      uic: item.Identifier,
      symbol: item.Symbol,
      description: item.Description,
      assetType: item.AssetType,
      tradable: item.Tradable,
    })) || [];

    return NextResponse.json({ instruments, total: data.Data?.length || 0 });
  } catch (error) {
    console.error("[Saxo Search API] Exception:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
