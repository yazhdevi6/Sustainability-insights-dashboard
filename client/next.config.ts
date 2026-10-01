import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:4000/api";

const nextConfig: NextConfig = {
  // Browser requests to /api/* are proxied to the Express backend, so the frontend
  // needs no CORS setup and never calls the LLM provider itself.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
};

export default nextConfig;
