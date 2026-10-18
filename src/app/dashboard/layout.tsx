import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";

export const metadata: Metadata = { title: "Dashboard (sample)", robots: { index: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
