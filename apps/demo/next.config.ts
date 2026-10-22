import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The library ships TypeScript source inside the workspace.
  transpilePackages: ["lasttouch"],
};

export default nextConfig;
