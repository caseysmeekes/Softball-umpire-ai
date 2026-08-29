/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // GitHub CI runs the standalone type/test checks. Vercel's job is to build
  // and deploy the client-side MVP without making deployment dependent on a
  // separate lint/type-check configuration.
  typescript: { ignoreBuildErrors: true },
}

module.exports = nextConfig
