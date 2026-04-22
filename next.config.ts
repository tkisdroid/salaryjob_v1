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
      // Must be >= the largest allowed upload. Business reg docs allow 10MB
      // (src/lib/supabase/storage-biz-reg.ts, bucket file_size_limit).
      // Avatars are capped at 5MB inside src/lib/supabase/storage.ts.
      bodySizeLimit: "10mb",
    },
  },
  // Prisma 7 + pg must be bundled on the server side only (not by Turbopack's
  // browser-targeted bundler). Without this, Turbopack tries to resolve
  // @prisma/client/runtime/client and pg in the client bundle and fails.
  serverExternalPackages: ["@prisma/client", "prisma", "pg", "@prisma/adapter-pg"],
};

export default nextConfig;
