"use client";

import React from "react";

export interface DesignStyle {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    tertiary: string;
    neutral: string;
  };
  typography: {
    headlineFont: string;
    bodyFont: string;
    labelFont: string;
  };
  fontSizes: {
    h1: number;
    h2: number;
    h3: number;
    body: number;
    label: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
}

export interface DesignStyleCardProps {
  style: DesignStyle;
  isSelected: boolean;
  onSelect: (styleId: string) => void;
}

export default function DesignStyleCard({ style, isSelected, onSelect }: DesignStyleCardProps) {
  return (
    <button
      onClick={() => onSelect(style.id)}
      className={`flex flex-col gap-4 p-6 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected
          ? "border-[#712ae2] bg-[rgba(113,42,226,0.05)]"
          : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1] hover:shadow-md"
      }`}
    >
      {/* Color Swatches */}
      <div className="flex gap-2 h-16">
        <div className="flex-1 rounded-md" style={{ backgroundColor: style.colors.primary }} title="Primary" />
        <div className="flex-1 rounded-md" style={{ backgroundColor: style.colors.secondary }} title="Secondary" />
        <div className="flex-1 rounded-md" style={{ backgroundColor: style.colors.tertiary }} title="Tertiary" />
        <div className="flex-1 rounded-md" style={{ backgroundColor: style.colors.neutral }} title="Neutral" />
      </div>

      {/* Style Name */}
      <div>
        <h3 className="text-[16px] font-bold text-slate-900">{style.name}</h3>
        <p className="text-[12px] text-slate-500 mt-1">{style.description}</p>
      </div>

      {/* Typography Info */}
      <div className="space-y-2 text-left text-[12px] text-slate-600">
        <div>
          <span className="font-semibold">Headline:</span> {style.typography.headlineFont}
        </div>
        <div>
          <span className="font-semibold">Body:</span> {style.typography.bodyFont}
        </div>
        <div>
          <span className="font-semibold">Label:</span> {style.typography.labelFont}
        </div>
      </div>

      {/* Font Sizes Preview */}
      <div className="space-y-1 text-left">
        <div style={{ fontSize: `${style.fontSizes.h1}px`, fontWeight: "bold" }}>Heading</div>
        <div style={{ fontSize: `${style.fontSizes.body}px` }}>Body text example</div>
        <div style={{ fontSize: `${style.fontSizes.label}px` }} className="text-slate-500">
          Label
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#712ae2] text-[#712ae2]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <span className="text-[12px] font-semibold">Selected</span>
        </div>
      )}
    </button>
  );
}
