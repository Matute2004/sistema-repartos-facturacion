import { NavLinks } from "@/app/components/layout/NavLinks";

const linkItems = [
  { href: "/", label: "Dashboard" },
  { href: "/clientes", label: "Clientes" },
  { href: "/repartos", label: "Repartos" },
  { href: "/remitos", label: "Remitos" },
  { href: "/facturacion", label: "Facturación" },
  { href: "/gastos", label: "Gastos" },
];

/**
 * Navegación principal. Sidebar fija en desktop, barra horizontal en mobile.
 */
export function NavBar() {
  return (
    <aside className="bg-zinc-900 text-zinc-100 lg:min-h-screen lg:sticky lg:top-0 lg:self-start">
      <div className="flex items-center gap-2 px-4 py-4 lg:px-5 lg:py-6">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500 text-sm font-black text-zinc-950">
          R
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">Repartos</p>
          <p className="text-[11px] text-zinc-400">Gestión del negocio</p>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 text-sm lg:flex-col lg:overflow-visible lg:px-3 lg:pb-6">
        <NavLinks links={linkItems} />
      </nav>
    </aside>
  );
}