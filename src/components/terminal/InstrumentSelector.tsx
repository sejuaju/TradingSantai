"use client";

import { useState, useRef, useEffect } from "react";
import {
  CATEGORY_LABELS,
  getInstrumentsByCategory,
  type Instrument,
  type InstrumentCategory,
} from "./config";

interface InstrumentSelectorProps {
  currentInstrument: Instrument;
  onSelect: (instrument: Instrument) => void;
}

const T = {
  mute: "rgba(255,255,255,0.52)",
  dim: "rgba(255,255,255,0.65)",
  sub: "rgba(255,255,255,0.78)",
  body: "rgba(255,255,255,0.90)",
  main: "rgba(255,255,255,0.97)",
};

export function InstrumentSelector({ currentInstrument, onSelect }: InstrumentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<InstrumentCategory>(
    currentInstrument.category
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const categories: InstrumentCategory[] = ["crypto", "forex", "commodities", "stocks", "indices"];

  const handleSelectInstrument = (instrument: Instrument) => {
    onSelect(instrument);
    setIsOpen(false);
  };

  const getBrokerBadge = (broker: string) => {
    if (broker === "BINANCE") {
      return (
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            padding: "2px 5px",
            borderRadius: 3,
            background: "rgba(243,186,47,0.15)",
            border: "1px solid rgba(243,186,47,0.3)",
            color: "#f3ba2f",
            letterSpacing: "0.08em",
          }}
        >
          BINANCE
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: 8,
          fontWeight: 700,
          padding: "2px 5px",
          borderRadius: 3,
          background: "rgba(0,169,224,0.15)",
          border: "1px solid rgba(0,169,224,0.3)",
          color: "#00a9e0",
          letterSpacing: "0.08em",
        }}
      >
        SAXO
      </span>
    );
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          borderRadius: 7,
          border: "1px solid rgba(255,255,255,0.15)",
          background: isOpen ? "rgba(0,212,232,0.12)" : "rgba(255,255,255,0.06)",
          color: T.main,
          cursor: "pointer",
          fontFamily: "monospace",
          fontSize: 12,
          fontWeight: 700,
          transition: "all 0.2s ease",
          letterSpacing: "0.05em",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.10)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
          }
        }}
      >
        <span style={{ fontSize: 14 }}>{currentInstrument.icon}</span>
        <span>{currentInstrument.symbol}</span>
        <span style={{ fontSize: 10, color: T.dim }}>▾</span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: 0,
            minWidth: 600,
            maxHeight: 500,
            background: "#0a0b12",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            zIndex: 1000,
            overflow: "hidden",
            display: "flex",
          }}
        >
          {/* Category Tabs - Left Side */}
          <div
            style={{
              width: 160,
              background: "#06070d",
              borderRight: "1px solid rgba(255,255,255,0.10)",
              padding: "12px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: T.mute,
                padding: "8px 12px 4px",
              }}
            >
              CATEGORIES
            </div>
            {categories.map((category) => {
              const instruments = getInstrumentsByCategory(category);
              const isActive = category === selectedCategory;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 2,
                    padding: "10px 12px",
                    borderRadius: 7,
                    border: "none",
                    background: isActive ? "rgba(0,212,232,0.15)" : "transparent",
                    color: isActive ? "#00d4e8" : T.sub,
                    cursor: "pointer",
                    fontFamily: "monospace",
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    }
                  }}
                >
                  <span style={{ letterSpacing: "0.05em" }}>
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span style={{ fontSize: 9, color: T.mute }}>
                    {instruments.length} instruments
                  </span>
                </button>
              );
            })}
          </div>

          {/* Instruments List - Right Side */}
          <div
            className="no-scrollbar"
            style={{
              flex: 1,
              maxHeight: 500,
              overflowY: "auto",
              padding: "12px 8px",
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.12em",
                color: T.mute,
                padding: "8px 12px 8px",
              }}
            >
              {CATEGORY_LABELS[selectedCategory].toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {getInstrumentsByCategory(selectedCategory).map((instrument) => {
                const isActive = instrument.id === currentInstrument.id;
                return (
                  <button
                    key={instrument.id}
                    onClick={() => handleSelectInstrument(instrument)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 7,
                      border: isActive
                        ? "1px solid rgba(0,212,232,0.3)"
                        : "1px solid transparent",
                      background: isActive ? "rgba(0,212,232,0.10)" : "transparent",
                      color: T.main,
                      cursor: "pointer",
                      fontFamily: "monospace",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "rgba(255,255,255,0.05)";
                        (e.currentTarget as HTMLButtonElement).style.border =
                          "1px solid rgba(255,255,255,0.08)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        (e.currentTarget as HTMLButtonElement).style.border =
                          "1px solid transparent";
                      }
                    }}
                  >
                    {/* Icon */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(255,255,255,0.08)",
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {instrument.icon}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: isActive ? "#00d4e8" : T.main,
                            letterSpacing: "0.05em",
                          }}
                        >
                          {instrument.symbol}
                        </span>
                        {getBrokerBadge(instrument.broker)}
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          color: T.dim,
                          letterSpacing: "0.03em",
                        }}
                      >
                        {instrument.displayName}
                      </span>
                    </div>

                    {/* Active Indicator */}
                    {isActive && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#00d4e8",
                          boxShadow: "0 0 10px #00d4e8",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
