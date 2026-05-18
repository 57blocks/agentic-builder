"use client";

import { useSidebarStore } from "@/store/sidebar-store";

export default function SidebarContent({ children }: { children: React.ReactNode }) {
  const collapsed = useSidebarStore((s) => s.collapsed);
  return (
    <div
      className={`flex-1 min-w-0 flex flex-col overflow-hidden transition-all duration-300 ${
        collapsed ? "pl-16" : "pl-60"
      }`}
    >
      {children}
    </div>
  );
}
