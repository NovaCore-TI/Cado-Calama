/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/cuestionario', destination: '/agendar', permanent: true },
      { source: '/test-confort', destination: '/agendar', permanent: true },
      { source: '/equipo-clinico', destination: '/equipo', permanent: true },
      { source: '/dr-javier-beiza-atencion-sin-miedo', destination: '/equipo/dr-javier-beiza', permanent: true },
      { source: '/urgencias-dentales', destination: '/urgencias', permanent: true },
    ];
  },
  serverExternalPackages: ['pdfkit'],
  outputFileTracingIncludes: { '/api/recursos/**/*': ['./public/fonts/Poppins-*.ttf'] },
};

export default nextConfig;
