import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const hstsValue = process.env.HSTS_PRELOAD === "true"
  ? "max-age=63072000; includeSubDomains; preload"
  : "max-age=31536000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  poweredByHeader: false,
  typedRoutes: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(!isDev ? [{ key: "Strict-Transport-Security", value: hstsValue }] : [])
        ]
      }
    ];
  }
};

export default nextConfig;
