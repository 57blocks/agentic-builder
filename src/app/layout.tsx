import type { Metadata } from "next";
import "./globals.css";
import { AuthGuard } from "@/components/AuthGuard";

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
    <html lang="en">
      <body className="antialiased min-h-screen bg-(--background) text-(--foreground) flex" suppressHydrationWarning>
        <AuthGuard />
        {children}
      </body>
    </html>
  );
}
