/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        // Proxy do caminho público /_b/* para a API real.
        // Usamos URL fixa aqui para evitar env com quebras de linha na Vercel.
        source: "/_b/:path*",
        destination: "https://api.trackingpesquisas.com.br/:path*",
      },
    ];
  },
};

export default nextConfig;
