import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Railway's Next.js guide: self-host the standalone server.
  output: "standalone",
};

export default nextConfig;
