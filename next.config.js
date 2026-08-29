/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The allocation UI is intentionally client-side for the MVP. Keep build-time
  // validation focused on Next compilation while the standalone test suite covers
  // the allocation rules.
  eslint: { ignoreDuringBuilds: true },
}

module.exports = nextConfig
