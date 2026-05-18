import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/AppNav";
import SidebarContent from "@/components/SidebarContent";

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
        <AppNav />
        <SidebarContent>{children}</SidebarContent>
      </body>
    </html>
  );
}
