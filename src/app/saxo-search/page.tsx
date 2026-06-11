"use client";

import { useState } from "react";
import Link from "next/link";

interface SearchResult {
  uic: number;
  symbol: string;
  description: string;
  assetType: string;
  tradable: boolean;
}

interface AutoSearchResult {
  id: string;
  symbol: string;
  uic: number | null;
  assetType: string;
  status: "success" | "error" | "pending";
  error?: string;
}

export default function SaxoSearchPage() {
  const [keyword, setKeyword] = useState("EUR");
  const [assetType, setAssetType] = useState("FxSpot");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Auto-search states
  const [autoSearchResults, setAutoSearchResults] = useState<AutoSearchResult[]>([]);
  const [autoSearching, setAutoSearching] = useState(false);

  const searchInstruments = async () => {
    setLoading(true);
    setError("");
    
    try {
      // Get token from localStorage
      const tokensStr = localStorage.getItem("saxo_tokens");
      if (!tokensStr) {
        setError("Not authenticated. Please login with Saxo first.");
        setLoading(false);
        return;
      }

      const tokens = JSON.parse(tokensStr);
      
      const response = await fetch("/api/saxo/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: tokens.access_token,
          keywords: keyword,
          assetType: assetType,
          limit: 50,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.error || "Search failed");
        setLoading(false);
        return;
      }

      const data = await response.json();
      setResults(data.instruments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto-search all instruments from config
  const autoSearchAllInstruments = async () => {
    setAutoSearching(true);
    setAutoSearchResults([]);
    
    // Define all instruments we need to search
    const instrumentsToSearch = [
      // Forex
      { id: "EURUSD", keywords: "EURUSD", assetType: "FxSpot" },
      { id: "GBPUSD", keywords: "GBPUSD", assetType: "FxSpot" },
      { id: "USDJPY", keywords: "USDJPY", assetType: "FxSpot" },
      { id: "AUDUSD", keywords: "AUDUSD", assetType: "FxSpot" },
      { id: "USDCAD", keywords: "USDCAD", assetType: "FxSpot" },
      { id: "USDCHF", keywords: "USDCHF", assetType: "FxSpot" },
      { id: "NZDUSD", keywords: "NZDUSD", assetType: "FxSpot" },
      // Commodities
      { id: "XAUUSD", keywords: "XAUUSD", assetType: "CfdOnIndex" },
      { id: "XAGUSD", keywords: "XAGUSD", assetType: "CfdOnIndex" },
      { id: "XTIUSD", keywords: "WTI", assetType: "CfdOnIndex" },
      { id: "XBRUSD", keywords: "Brent", assetType: "CfdOnIndex" },
      // Stocks
      { id: "AAPL", keywords: "AAPL", assetType: "Stock" },
      { id: "MSFT", keywords: "MSFT", assetType: "Stock" },
      { id: "GOOGL", keywords: "GOOGL", assetType: "Stock" },
      { id: "AMZN", keywords: "AMZN", assetType: "Stock" },
      { id: "TSLA", keywords: "TSLA", assetType: "Stock" },
      { id: "NVDA", keywords: "NVDA", assetType: "Stock" },
      { id: "META", keywords: "META", assetType: "Stock" },
      // Indices
      { id: "US500", keywords: "S&P 500", assetType: "CfdOnIndex" },
      { id: "US30", keywords: "Dow Jones", assetType: "CfdOnIndex" },
      { id: "NAS100", keywords: "NASDAQ 100", assetType: "CfdOnIndex" },
    ];

    const tokensStr = localStorage.getItem("saxo_tokens");
    if (!tokensStr) {
      setError("Not authenticated. Please login with Saxo first.");
      setAutoSearching(false);
      return;
    }

    const tokens = JSON.parse(tokensStr);
    const results: AutoSearchResult[] = [];

    // Search each instrument
    for (const inst of instrumentsToSearch) {
      try {
        const response = await fetch("/api/saxo/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accessToken: tokens.access_token,
            keywords: inst.keywords,
            assetType: inst.assetType,
            limit: 10,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const instruments = data.instruments || [];
          
          // Find exact match or first tradable
          const match = instruments.find((i: SearchResult) => 
            i.tradable && (
              i.symbol.toUpperCase() === inst.id.toUpperCase() ||
              i.symbol.toUpperCase().includes(inst.id.toUpperCase())
            )
          ) || instruments.find((i: SearchResult) => i.tradable);

          if (match) {
            results.push({
              id: inst.id,
              symbol: match.symbol,
              uic: match.uic,
              assetType: match.assetType,
              status: "success",
            });
          } else {
            results.push({
              id: inst.id,
              symbol: inst.id,
              uic: null,
              assetType: inst.assetType,
              status: "error",
              error: "Not found or not tradable",
            });
          }
        } else {
          results.push({
            id: inst.id,
            symbol: inst.id,
            uic: null,
            assetType: inst.assetType,
            status: "error",
            error: "Search failed",
          });
        }
      } catch (err) {
        results.push({
          id: inst.id,
          symbol: inst.id,
          uic: null,
          assetType: inst.assetType,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }

      // Update UI after each search
      setAutoSearchResults([...results]);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setAutoSearching(false);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>Saxo Instrument Search - Find Valid UIC</h1>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Use this tool to find the correct UIC (Universal Instrument Code) for instruments in your Saxo account.
      </p>

      {/* AUTO SEARCH SECTION */}
      <div style={{ marginBottom: "30px", padding: "20px", background: "#e3f2fd", borderRadius: "8px", border: "2px solid #2196f3" }}>
        <h2 style={{ marginTop: 0, color: "#1976d2" }}>🚀 AUTO SEARCH ALL INSTRUMENTS</h2>
        <p style={{ color: "#555" }}>
          Click the button below to automatically search for ALL 21 instruments at once!
        </p>
        <button
          onClick={autoSearchAllInstruments}
          disabled={autoSearching}
          style={{
            padding: "12px 24px",
            background: autoSearching ? "#ccc" : "#2196f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: autoSearching ? "not-allowed" : "pointer",
            fontWeight: "bold",
            fontSize: "16px",
          }}
        >
          {autoSearching ? `Searching... (${autoSearchResults.length}/21)` : "🔍 AUTO SEARCH ALL INSTRUMENTS"}
        </button>

        {/* Auto Search Results */}
        {autoSearchResults.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <h3>Results ({autoSearchResults.filter(r => r.status === "success").length}/21 found):</h3>
            
            {/* Success results - Ready to copy */}
            {autoSearchResults.filter(r => r.status === "success").length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ color: "#2e7d32" }}>✅ Found ({autoSearchResults.filter(r => r.status === "success").length}):</h4>
                <div style={{ 
                  background: "#f5f5f5", 
                  padding: "15px", 
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  fontFamily: "monospace",
                  fontSize: "13px",
                  maxHeight: "300px",
                  overflowY: "auto",
                }}>
                  {autoSearchResults.filter(r => r.status === "success").map(r => (
                    <div key={r.id} style={{ marginBottom: "4px" }}>
                      {r.id} = {r.uic} <span style={{ color: "#666" }}>({r.assetType})</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    const text = autoSearchResults
                      .filter(r => r.status === "success")
                      .map(r => `${r.id} = ${r.uic}`)
                      .join("\n");
                    navigator.clipboard.writeText(text);
                    alert("Copied to clipboard! Paste this to your developer.");
                  }}
                  style={{
                    marginTop: "10px",
                    padding: "8px 16px",
                    background: "#4caf50",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  📋 COPY ALL UIC TO CLIPBOARD
                </button>
              </div>
            )}

            {/* Error results */}
            {autoSearchResults.filter(r => r.status === "error").length > 0 && (
              <div>
                <h4 style={{ color: "#d32f2f" }}>❌ Not Found ({autoSearchResults.filter(r => r.status === "error").length}):</h4>
                <div style={{ background: "#ffebee", padding: "10px", borderRadius: "4px", fontSize: "13px" }}>
                  {autoSearchResults.filter(r => r.status === "error").map(r => (
                    <div key={r.id} style={{ marginBottom: "4px" }}>
                      {r.id}: {r.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <hr style={{ margin: "30px 0", border: "none", borderTop: "2px solid #ddd" }} />

      {/* MANUAL SEARCH SECTION */}
      <h2>Manual Search (Optional)</h2>
      <div style={{ marginBottom: "20px", padding: "20px", background: "#f5f5f5", borderRadius: "8px" }}>
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Search Keyword (e.g., EUR, GOLD, AAPL):
          </label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="EUR"
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>
            Asset Type:
          </label>
          <select
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            style={{
              width: "100%",
              padding: "8px",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          >
            <option value="FxSpot">Forex (FxSpot)</option>
            <option value="Stock">Stocks</option>
            <option value="CfdOnIndex">Index CFD</option>
            <option value="CfdOnStock">Stock CFD</option>
            <option value="CfdOnFutures">Futures CFD</option>
          </select>
        </div>

        <button
          onClick={searchInstruments}
          disabled={loading}
          style={{
            padding: "10px 20px",
            background: loading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "Searching..." : "Search Instruments"}
        </button>
      </div>

      {error && (
        <div style={{ padding: "15px", background: "#fee", border: "1px solid #fcc", borderRadius: "4px", marginBottom: "20px", color: "#c00" }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h2>Found {results.length} instruments:</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>UIC</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>Symbol</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>Description</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>Asset Type</th>
                  <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>Tradable</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => (
                  <tr key={index} style={{ borderBottom: "1px solid #dee2e6" }}>
                    <td style={{ padding: "12px", fontWeight: "bold", color: "#007bff" }}>{item.uic}</td>
                    <td style={{ padding: "12px", fontFamily: "monospace" }}>{item.symbol}</td>
                    <td style={{ padding: "12px" }}>{item.description}</td>
                    <td style={{ padding: "12px" }}>{item.assetType}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        background: item.tradable ? "#d4edda" : "#f8d7da",
                        color: item.tradable ? "#155724" : "#721c24",
                      }}>
                        {item.tradable ? "YES" : "NO"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: "40px", padding: "20px", background: "#fff3cd", border: "1px solid #ffc107", borderRadius: "4px" }}>
        <h3>⚠️ Important Instructions:</h3>
        <ol>
          <li><strong>Login first:</strong> Go to <Link href="/" style={{ color: "#007bff" }}>home page</Link> and click LOGIN button</li>
          <li><strong>Search for instruments:</strong> Use keywords like &quot;EUR&quot;, &quot;GOLD&quot;, &quot;AAPL&quot;</li>
          <li><strong>Copy the UIC:</strong> Find the instrument you want and copy its UIC number</li>
          <li><strong>Update config.ts:</strong> Replace the UIC in <code>src/components/terminal/config.ts</code></li>
          <li><strong>Restart server:</strong> Stop and start your dev server again</li>
        </ol>
      </div>
    </div>
  );
}
