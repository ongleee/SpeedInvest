/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow streaming responses
  experimental: {
    serverComponentsExternalPackages: ["yahoo-finance2", "cheerio"],
  },
  // CORS headers for the Chrome Extension
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin",  value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Cache-Control",                value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
