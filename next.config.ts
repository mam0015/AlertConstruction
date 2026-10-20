import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  // vinext applies this limit to every multipart POST (it cannot tell an upload route from a form action). Its default is 1 MB,
  // which rejected ordinary phone photos with "413 Payload Too Large". The upload routes enforce their own, smaller limits
  // (5-25 MB) and return a readable error.
  experimental: {
    serverActions: { bodySizeLimit: "30mb" },
  },
};

export default nextConfig;
