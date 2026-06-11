import { NextRequest, NextResponse } from "next/server";

const SAXO_API_URL = process.env.NEXT_PUBLIC_SAXO_ENVIRONMENT === "LIVE"
  ? "https://gateway.saxobank.com/openapi"
  : "https://gateway.saxobank.com/sim/openapi";

/**
 * Get user's accounts - Returns list of accounts with AccountKey
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Missing access token" },
        { status: 400 }
      );
    }

    // Get accounts for current user
    const url = `${SAXO_API_URL}/port/v1/accounts/me`;
    
    console.log("[Saxo Accounts API] Fetching accounts from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("[Saxo Accounts API] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Saxo Accounts API] Error response:", errorText.substring(0, 500));
      return NextResponse.json(
        { error: `Saxo API error: ${response.status}`, details: errorText.substring(0, 200) },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[Saxo Accounts API] Success, accounts count:", data.Data?.length || 0);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Saxo Accounts API] Exception:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
