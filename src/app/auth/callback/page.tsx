"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForTokens } from "@/lib/saxo-auth";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get authorization code from URL
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const errorParam = searchParams.get("error");

        // Check for errors
        if (errorParam) {
          throw new Error(
            searchParams.get("error_description") || "Authorization failed"
          );
        }

        if (!code) {
          throw new Error("No authorization code received");
        }

        // Verify state (CSRF protection)
        const storedState = sessionStorage.getItem("saxo_oauth_state");
        if (state !== storedState) {
          throw new Error("Invalid state parameter. Possible CSRF attack.");
        }

        // Exchange code for tokens
        setStatus("loading");
        await exchangeCodeForTokens(code);

        // Clear state
        sessionStorage.removeItem("saxo_oauth_state");

        // Success!
        setStatus("success");
        
        // Redirect to home page with EURUSD instrument parameter (auto-select Saxo instrument)
        console.log("[Auth] Redirecting to EUR/USD chart...");
        setTimeout(() => {
          router.push("/?instrument=EURUSD");
        }, 2000);
      } catch (err) {
        console.error("Auth callback error:", err);
        setStatus("error");
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#08090f",
        fontFamily: "monospace",
      }}
    >
      <div
        style={{
          maxWidth: 500,
          padding: 40,
          background: "#0d0f1a",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          textAlign: "center",
        }}
      >
        {status === "loading" && (
          <>
            <div
              style={{
                width: 60,
                height: 60,
                border: "4px solid rgba(255,255,255,0.1)",
                borderTop: "4px solid #00d4e8",
                borderRadius: "50%",
                margin: "0 auto 20px",
                animation: "spin 1s linear infinite",
              }}
            />
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#00d4e8",
                letterSpacing: "0.1em",
                marginBottom: 12,
              }}
            >
              AUTHENTICATING...
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.6,
              }}
            >
              Exchanging authorization code for access tokens.
              <br />
              Please wait...
            </p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </>
        )}

        {status === "success" && (
          <>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(34,197,94,0.15)",
                border: "2px solid rgba(34,197,94,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: 30,
              }}
            >
              ✓
            </div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#4ade80",
                letterSpacing: "0.1em",
                marginBottom: 12,
              }}
            >
              AUTHENTICATION SUCCESS
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.6,
              }}
            >
              Your Saxo Bank account has been connected successfully.
              <br />
              Redirecting to terminal...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(239,68,68,0.15)",
                border: "2px solid rgba(239,68,68,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: 30,
              }}
            >
              ✕
            </div>
            <h1
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#f87171",
                letterSpacing: "0.1em",
                marginBottom: 12,
              }}
            >
              AUTHENTICATION FAILED
            </h1>
            <p
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.6)",
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              {error}
            </p>
            <button
              onClick={() => router.push("/")}
              style={{
                padding: "10px 24px",
                borderRadius: 8,
                border: "1px solid rgba(0,212,232,0.3)",
                background: "rgba(0,212,232,0.12)",
                color: "#00d4e8",
                fontFamily: "monospace",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                cursor: "pointer",
              }}
            >
              RETURN HOME
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#08090f",
            fontFamily: "monospace",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          Loading...
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
