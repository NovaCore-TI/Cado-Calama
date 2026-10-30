/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pdfkit'],
  outputFileTracingIncludes: { '/api/recursos/**/*': ['./public/fonts/Poppins-*.ttf'] },
};

export default nextConfig;
