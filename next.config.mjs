/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      // Pretty URL for the assignment deck — file lives at public/assignmentwork.html.
      { source: "/assignmentwork", destination: "/assignmentwork.html" },
    ];
  },
};

export default nextConfig;
