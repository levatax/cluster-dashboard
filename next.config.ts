import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["mongoose", "@kubernetes/client-node", "ws", "@node-rs/argon2"],
};

export default nextConfig;
