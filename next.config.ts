import type { NextConfig } from "next";

/**
 * Baseline security headers.
 *
 * These are deliberately conservative: they close the cheap classes of exposure (MIME
 * sniffing, clickjacking, referrer leakage, ambient camera/mic access) without needing
 * a nonce pipeline, so they cannot break a build that is already in production.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    // The passport-photo studio uses the camera on demand; everything else stays off.
    value: "camera=(self), microphone=(), geolocation=(self), payment=()",
  },
];

const nextConfig: NextConfig = {
  // Lets a verification build run beside a live `next dev` without fighting over .next
  // (the dev server owns that directory while it is running).
  distDir: process.env.NEXT_DIST_DIR || ".next",

  async headers() {
    return [
      { source: "/(.*)", headers: securityHeaders },
      {
        // Account data must never be cached by a browser, a proxy, or a CDN.
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
