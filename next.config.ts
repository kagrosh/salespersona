import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // A stray package-lock.json exists in the user's home directory; pin the workspace root to this project.
  turbopack: { root: path.resolve(process.cwd()) },
};

export default nextConfig;
