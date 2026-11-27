import type { NextConfig } from "next";

// Paths without /ar or /en are redirected to Arabic by proxy.ts (dev-2 D2-4), not here.
const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // app/global-not-found.tsx: the 404 page for addresses that match no route, now that the root
  // layout sits under app/[locale] (Next docs: not-found, "global-not-found.js")
  experimental: { globalNotFound: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
