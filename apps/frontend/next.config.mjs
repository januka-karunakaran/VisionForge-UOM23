/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Baked in at build time — overrides any missing Vercel env var
    NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE || "https://visionforge-uom23.onrender.com",
    NEXT_PUBLIC_CR_API_BASE: process.env.NEXT_PUBLIC_CR_API_BASE || "https://visionforge-uom23.onrender.com/api/v1/projects",
  },
};

export default nextConfig;
