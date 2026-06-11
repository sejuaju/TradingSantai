import { NextRequest, NextResponse } from "next/server";

// Server-side token exchange (secure, no CORS issues)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, redirect_uri } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Authorization code is required" },
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

    // Exchange code for tokens (server-to-server, no CORS)
    const response = await fetch(`${authUrl}/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirect_uri,
        client_id: appKey,
        client_secret: appSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.json(
        { error: "Token exchange failed", details: errorText },
        { status: response.status }
      );
    }

    const tokens = await response.json();

    // Return tokens to client
    return NextResponse.json(tokens);
  } catch (error) {
    console.error("Token exchange error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
