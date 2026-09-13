import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/app/components/layout/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Ohana Comisiones",
    template: "%s | Ohana Comisiones",
  },
  description:
    "Ohana Comisiones — sistema de gestión: clientes, repartos, remitos, gastos y facturación.",
};

// Todas las páginas leen datos de la base (Turso). Si se prerenderizaran como
// estáticas en el build quedarían congeladas con los datos de ese momento, por
// eso forzamos renderizado dinámico en cada request.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-zinc-100 text-zinc-900">
        <div className="lg:grid lg:grid-cols-[240px_1fr]">
          <NavBar />
          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
