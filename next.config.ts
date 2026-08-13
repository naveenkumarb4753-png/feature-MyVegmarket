import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }],
  },

  // ✅ Fix pdfkit ENOENT Helvetica.afm (prevents bundling pdfkit)
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
