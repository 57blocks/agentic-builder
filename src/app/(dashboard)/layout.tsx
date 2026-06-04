import AppNav from "@/components/AppNav";
import SidebarContent from "@/components/SidebarContent";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppNav />
      <SidebarContent>{children}</SidebarContent>
    </>
  );
}
