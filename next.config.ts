import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/post", destination: "/home", permanent: false },
      { source: "/posts", destination: "/home", permanent: false },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // Prisma 7 + pg must be bundled on the server side only (not by Turbopack's
  // browser-targeted bundler). Without this, Turbopack tries to resolve
  // @prisma/client/runtime/client and pg in the client bundle and fails.
  serverExternalPackages: ["@prisma/client", "prisma", "pg", "@prisma/adapter-pg"],
};

export default nextConfig;
