/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Skip ESLint during `next build`. We rely on TypeScript (`pnpm tsc --noEmit`)
    // and a future lint pass for code quality, but ESLint warnings about `any`
    // shouldn't block deploys.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
