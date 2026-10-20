import type { MetadataRoute } from "next";

const base = "https://staymosaic.site";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/features", "/use-cases", "/pricing", "/demo", "/faq", "/request"].map((p) => ({ url: base + p }));
}
