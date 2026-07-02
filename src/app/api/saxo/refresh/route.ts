import { NextRequest, NextResponse } from "next/server";
import { setDemoRefreshToken } from "@/lib/saxo-token-store";

// Server-side token refresh (secure, no CORS issues)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    // Get config from environment (server-side only)
    const appKey = process.env.NEXT_PUBLIC_SAXO_APP_KEY;
    const appSecret = process.env.SAXO_APP_SECRET;
    const environment = process.env.NEXT_PUBLIC_SAXO_ENVIRONMENT || "SIM";

    if (!appKey || !appSecret) {
      return NextResponse.json(
        { error: "Saxo credentials not configured" },
        { status: 500 }
      );
    }

    // Determine auth URL based on environment
    const authUrl =
      environment === "SIM"
        ? "https://sim.logonvalidation.net"
        : "https://live.logonvalidation.net";

    // Refresh token (server-to-server, no CORS)
    const response = await fetch(`${authUrl}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refresh_token,
        client_id: appKey,
        client_secret: appSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token refresh failed:", errorText);
      return NextResponse.json(
        { error: "Token refresh failed", details: errorText },
        { status: response.status }
      );
    }

    const tokens = await response.json();

    if (tokens.refresh_token) {
      await setDemoRefreshToken(tokens.refresh_token);
    }

    return NextResponse.json(tokens);
  } catch (error) {
    console.error("Token refresh error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
