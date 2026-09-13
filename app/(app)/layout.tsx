import { redirect } from "next/navigation";
import { obtenerUsuarioActual } from "@/lib/auth";
import { NavBar } from "@/app/components/layout/NavBar";

/**
 * Layout del área autenticada. Toda página dentro de `app/(app)/` pasa por
 * este layout que garantiza sesión activa y muestra el sidebar.
 */
export default async function LayoutEsqueleto({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/login");

  return (
    <div className="lg:grid lg:grid-cols-[240px_1fr]">
      <NavBar usuario={usuario} />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}