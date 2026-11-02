import Script from "next/script";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./glow.css";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  metadataBase: new URL("https://staymosaic.site"),
  openGraph: { siteName: "StayMosaic", url: "https://staymosaic.site", type: "website" },
  title: { default: "StayMosaic: AI-native operations for hotels and serviced apartments", template: "%s · StayMosaic" },
  description:
    "StayMosaic turns guest requests into organised, trackable tasks and helps hospitality teams coordinate service across departments. AI recommends; your staff decide.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1e3b2f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Script src="/glow.js" strategy="afterInteractive" />
        <script type="application/ld+json" id="founders-ld" dangerouslySetInnerHTML={{ __html: "{\"@context\": \"https://schema.org\", \"@type\": \"Organization\", \"name\": \"StayMosaic\", \"url\": \"https://staymosaic.site\", \"email\": \"hello@staymosaic.site\", \"logo\": \"https://staymosaic.site/icon-512.png\", \"founder\": [{\"@type\": \"Person\", \"name\": \"Harris Morrison\", \"jobTitle\": \"Founder/CEO\"}, {\"@type\": \"Person\", \"name\": \"Majekodunmi Fasheke\", \"jobTitle\": \"Co-founder/CTO\"}]}" }} />{children}</body>
    </html>
  );
}
