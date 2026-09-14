import type { NextConfig } from "next";

/**
 * Headers de seguridad básicos (ver docs de Next.js: next-config-js/headers).
 * `Strict-Transport-Security` (HSTS) solo se agrega en producción, porque en
 * http local el navegador ignora el header y puede confundir al login.
 * Nota: una CSP estricta (`default-src 'self'`) es viable pero conviene
 * probarla en el deploy real antes de activarla (Next dev usa eval para HMR).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // La importación masiva de clientes (hasta 5000 filas) supera el límite de
  // 1 MB por defecto de las Server Actions. Lo subimos a un tope acotado; la
  // acción igual valida cantidad de filas y largo de campos del lado del server.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  async headers() {
    const headers = [...securityHeaders];
    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [
      {
        source: "/(.*)",
        headers,
      },
    ];
  },
};

export default nextConfig;
