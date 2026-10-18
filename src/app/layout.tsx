import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "StayMosaic: AI-native operations for hotels and serviced apartments", template: "%s · StayMosaic" },
  description:
    "StayMosaic turns guest requests into organised, trackable tasks and helps hospitality teams coordinate service across departments. AI recommends; your staff decide.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1e3b2f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
