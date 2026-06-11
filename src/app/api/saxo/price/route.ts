import { NextRequest, NextResponse } from "next/server";

const SAXO_API_URL = process.env.NEXT_PUBLIC_SAXO_ENVIRONMENT === "LIVE"
  ? "https://gateway.saxobank.com/openapi"
  : "https://gateway.saxobank.com/sim/openapi";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, uic, assetType } = body;

    if (!accessToken || !uic || !assetType) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const url = `${SAXO_API_URL}/trade/v1/infoprices?Uic=${uic}&AssetType=${assetType}&FieldGroups=Quote,PriceInfo`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Saxo Price API error:", response.status, errorText);
      return NextResponse.json(
        { error: `Saxo API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Price API error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
