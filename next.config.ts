import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/feed",
        destination: "https://test.qvamp.eu/feed",
      },
    ];
  },
};

export default nextConfig;
