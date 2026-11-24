import type { NextConfig } from "next";

/*
  Temporary bridge for the move to /ar and /en (dev-1 D1-1), non-permanent so browsers don't keep
  it: `/` goes to `/ar`, and the old unprefixed pages to their Arabic address, with the query
  string (/events?m=2026-12 → /ar/events?m=2026-12). Abdullah's proxy (D2-4) redirects every
  unprefixed path the same way, so that PR deletes this whole redirects() block and its test in
  tests/unit/layout.test.tsx. Until then these redirects run before any Proxy (Next's execution
  order). D1-5's localePath() links stop internal links from needing it; bookmarks still will.
*/
const OLD_PAGES = ["/events", "/events/:id", "/departments/:slug", "/library", "/talent", "/privacy", "/sign-in", "/credits"];

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
  async redirects() {
    return [
      { source: "/", destination: "/ar", permanent: false },
      ...OLD_PAGES.map((source) => ({ source, destination: `/ar${source}`, permanent: false })),
    ];
  },
};

export default nextConfig;
