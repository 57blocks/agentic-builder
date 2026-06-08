import type { Metadata } from "next";
import "./globals.css";
import { AuthGuard } from "@/components/AuthGuard";
import { Geist, Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Agentic Builder",
  description: "AI-powered desktop application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="antialiased min-h-screen bg-(--background) text-(--foreground) flex" suppressHydrationWarning>
        <AuthGuard />
        {children}
      </body>
    </html>
  );
}
