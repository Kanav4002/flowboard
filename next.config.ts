import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app is intentionally Node-only: `lib/db.ts` uses the built-in `node:sqlite`
  // module, so route handlers must run on the Node.js runtime (the default).
};

export default nextConfig;
