import { Suspense } from "react";
import { exigirAdmin } from "@/lib/auth";
import { NavBar } from "@/app/components/layout/NavBar";

/**
 * Layout del área autenticada. Toda página dentro de `app/(app)/` pasa por
 * este layout que garantiza sesión activa con rol admin y muestra el sidebar.
 *
 * El chequeo de sesión (`cookies()` vía exigirAdmin) va dentro de un
 * <Suspense>: así el shell (estructura + fallback del menú) se puede
 * prerenderizar con Cache Components y lo único que streama por sesión es el
 * nombre del usuario en el navbar. Cada request sigue validando la sesión.
 */
export default function LayoutEsqueleto({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="lg:grid lg:grid-cols-[240px_1fr]">
      <Suspense fallback={<NavBarSkeleton />}>
        <NavBarConSesion />
      </Suspense>
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}

/** Resuelve el usuario de la sesión y arma la navegación con su nombre. */
async function NavBarConSesion() {
  const usuario = await exigirAdmin();
  return <NavBar usuario={usuario} />;
}

/** Esqueleto del sidebar para la parte prerenderizada del shell. */
function NavBarSkeleton() {
  return (
    <aside className="bg-zinc-900 text-zinc-100 lg:min-h-screen lg:sticky lg:top-0 lg:self-start">
      <div className="flex items-center gap-2 px-4 py-4 lg:px-5 lg:py-6">
        <div className="size-9 shrink-0 animate-pulse rounded-lg bg-zinc-800" />
        <div className="leading-tight">
          <div className="h-4 w-36 animate-pulse rounded bg-zinc-800" />
          <div className="mt-1 h-3 w-24 animate-pulse rounded bg-zinc-800" />
        </div>
      </div>
      <div className="space-y-2 px-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-9 animate-pulse rounded-lg bg-zinc-800/70"
          />
        ))}
      </div>
    </aside>
  );
}