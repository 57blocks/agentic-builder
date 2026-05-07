import { NextRequest, NextResponse } from "next/server";

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prdContent } = body;

    if (!prdContent || !prdContent.trim()) {
      return NextResponse.json(
        { error: "PRD content is required" },
        { status: 400 }
      );
    }

    // For now, return mock design styles
    // In production, this would call an LLM to generate styles based on PRD
    const designStyles: DesignStyle[] = [
      {
        id: "style-1",
        name: "Modern Minimal",
        description: "Clean, minimalist design with modern aesthetics",
        colors: {
          primary: "#0F172A",
          secondary: "#712AE2",
          tertiary: "#0EA5E9",
          neutral: "#64748B",
        },
        typography: {
          headlineFont: "Inter",
          bodyFont: "Inter",
          labelFont: "Space Grotesk",
        },
        fontSizes: {
          h1: 30,
          h2: 24,
          h3: 20,
          body: 14,
          label: 12,
        },
        spacing: {
          xs: 4,
          sm: 8,
          md: 16,
          lg: 24,
          xl: 32,
        },
      },
      {
        id: "style-2",
        name: "Bold & Vibrant",
        description: "Eye-catching design with bold colors and typography",
        colors: {
          primary: "#1A1A2E",
          secondary: "#E91E63",
          tertiary: "#FF9800",
          neutral: "#757575",
        },
        typography: {
          headlineFont: "Poppins",
          bodyFont: "Open Sans",
          labelFont: "Roboto",
        },
        fontSizes: {
          h1: 36,
          h2: 28,
          h3: 22,
          body: 16,
          label: 13,
        },
        spacing: {
          xs: 6,
          sm: 12,
          md: 20,
          lg: 28,
          xl: 40,
        },
      },
      {
        id: "style-3",
        name: "Elegant Professional",
        description: "Sophisticated design suitable for enterprise applications",
        colors: {
          primary: "#1F2937",
          secondary: "#7C3AED",
          tertiary: "#06B6D4",
          neutral: "#6B7280",
        },
        typography: {
          headlineFont: "Georgia",
          bodyFont: "Segoe UI",
          labelFont: "Trebuchet MS",
        },
        fontSizes: {
          h1: 32,
          h2: 26,
          h3: 21,
          body: 15,
          label: 12,
        },
        spacing: {
          xs: 5,
          sm: 10,
          md: 18,
          lg: 26,
          xl: 36,
        },
      },
      {
        id: "style-4",
        name: "Playful Creative",
        description: "Fun and creative design for engaging user experiences",
        colors: {
          primary: "#000000",
          secondary: "#FF6B6B",
          tertiary: "#4ECDC4",
          neutral: "#8E9BA8",
        },
        typography: {
          headlineFont: "Montserrat",
          bodyFont: "Raleway",
          labelFont: "Quicksand",
        },
        fontSizes: {
          h1: 34,
          h2: 27,
          h3: 22,
          body: 16,
          label: 13,
        },
        spacing: {
          xs: 6,
          sm: 12,
          md: 18,
          lg: 24,
          xl: 32,
        },
      },
      {
        id: "style-5",
        name: "Dark Mode Sleek",
        description: "Modern dark theme perfect for tech products",
        colors: {
          primary: "#0F172A",
          secondary: "#A78BFA",
          tertiary: "#38BDF8",
          neutral: "#94A3B8",
        },
        typography: {
          headlineFont: "IBM Plex Sans",
          bodyFont: "Fira Sans",
          labelFont: "JetBrains Mono",
        },
        fontSizes: {
          h1: 32,
          h2: 26,
          h3: 21,
          body: 14,
          label: 12,
        },
        spacing: {
          xs: 4,
          sm: 8,
          md: 16,
          lg: 24,
          xl: 32,
        },
      },
    ];

    return NextResponse.json({ styles: designStyles });
  } catch (error) {
    console.error("[generate-design-styles] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate design styles" },
      { status: 500 }
    );
  }
}
