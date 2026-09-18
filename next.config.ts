import type { NextConfig } from "next";

/**
 * Headers de seguridad completos para producción.
 * 
 * Incluye:
 * - X-Content-Type-Options: nosniff (previene MIME sniffing)
 * - X-Frame-Options: SAMEORIGIN (previene clickjacking)
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - Permissions-Policy: restricciones para APIs sensibles
 * - Cross-Origin policies: aislamiento de recursos
 * - CSP: Content Security Policy mejorada
 * 
 * HSTS solo en producción (el header puede causar problemas en desarrollo).
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
  // CSP más restrictiva:
  // - default-src 'self': solo recursos del mismo origen por defecto
  // - script-src 'self': solo scripts propios (sin inline en producción)
  // - style-src 'self' 'unsafe-inline': necesario para Tailwind + Next.js
  // - font-src: fuentes de Google
  // - img-src: imágenes del mismo origen + data: + blob:
  // - connect-src: solo mismo origen + APIs necesarias
  // - frame-ancestors: previene clickjacking en iframes
  { 
    key: "Content-Security-Policy", 
    value: 
      process.env.NODE_ENV === "production"
        ? "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
        : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self';"
  },
];

const nextConfig: NextConfig = {
  // Cache Components (PPR + navegación instantánea): habilita la directiva
  // `use cache` en las páginas de los apartados. Con esto el router de Next
  // prefetchea el contenido ya renderizado (no solo el esqueleto), de modo que
  // al navegar rápido entre /clientes, /repartos, /gastos, etc. el cambio es
  // instantáneo y no vuelve a consultar Turso en cada click. Requiere runtime
  // Node.js (las páginas ya lo usan; el proxy de edge no se ve afectado).
  cacheComponents: true,
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
