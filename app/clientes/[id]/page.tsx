import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { obtenerCliente } from "@/lib/data/clientes";
import { formatFecha } from "@/lib/types";
import { ButtonLink } from "@/app/components/ui/form";
import {
  Badge,
  Card,
  CardHeader,
  PageHeader,
} from "@/app/components/ui/display";
import { ClienteDeleteButton } from "@/app/components/clientes/ClienteDeleteButton";

export const metadata = { title: "Detalle de cliente" };

export default async function DetalleClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await obtenerCliente(Number(id));
  if (!cliente) notFound();

  const filas: Array<{ label: string; valor: ReactNode }> = [
    { label: "CUIT / CUIL", valor: cliente.cuit ? <Badge tone="sky">{cliente.cuit}</Badge> : <span className="text-zinc-400">No cargado</span> },
    { label: "Domicilio", valor: [cliente.direccion, cliente.localidad].filter(Boolean).join(", ") || "—" },
    { label: "Teléfono", valor: cliente.telefono ?? "—" },
    { label: "Email", valor: cliente.email ?? "—" },
    {
      label: "Cliente desde",
      valor: formatFecha(cliente.creadoEn.slice(0, 10)),
    },
  ];

  return (
    <div>
      <PageHeader
        title={cliente.nombre}
        description={`Cliente #${cliente.id}`}
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/clientes" variant="secondary">
              ← Clientes
            </ButtonLink>
            <ButtonLink
              href={`/clientes/${cliente.id}/editar`}
              variant="primary"
            >
              Editar
            </ButtonLink>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader title="Datos del cliente" />
          <dl className="grid gap-x-8 gap-y-4 px-5 py-4 sm:grid-cols-2">
            {filas.map((fila) => (
              <div key={fila.label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {fila.label}
                </dt>
                <dd className="mt-0.5 text-sm text-zinc-800">{fila.valor}</dd>
              </div>
            ))}
          </dl>
          {cliente.notas && (
            <div className="border-t border-zinc-100 px-5 py-4">
              <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Notas
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">
                {cliente.notas}
              </p>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader title="Remitos" description="Historial de remitos del cliente" />
          <p className="px-5 py-8 text-sm text-zinc-500">
            El módulo de remitos se habilita en la siguiente etapa. Acá vas a
            poder emitir y ver los remitos de{" "}
            <span className="font-medium text-zinc-700">{cliente.nombre}</span>.
          </p>
        </Card>
      </div>

      <div className="mt-6 flex justify-end">
        <Card className="p-4">
          <ClienteDeleteButton id={cliente.id} nombre={cliente.nombre} />
        </Card>
      </div>
    </div>
  );
}