import Link from "next/link";
import { listarClientes } from "@/lib/data/clientes";
import { ButtonLink } from "@/app/components/ui/form";
import { PageHeader } from "@/app/components/ui/display";
import { Card, Table, Td, Th } from "@/app/components/ui/display";
import { Badge } from "@/app/components/ui/display";

export const metadata = { title: "Clientes" };

export default async function ClientesPage() {
  const clientes = await listarClientes();
  const conTelefono = clientes.filter((c) => c.telefono).length;

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${clientes.length} clientes registrados · ${conTelefono} con teléfono`}
        action={<ButtonLink href="/clientes/nuevo" variant="primary">+ Nuevo cliente</ButtonLink>}
      />

      <Card>
        {clientes.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-zinc-700">Todavía no hay clientes</p>
            <p className="mt-1 text-sm text-zinc-500">
              Cargá tu primer cliente para empezar a armar remitos.
            </p>
            <div className="mt-4">
              <ButtonLink href="/clientes/nuevo" variant="primary">
                + Nuevo cliente
              </ButtonLink>
            </div>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>CUIT / CUIL</Th>
                <Th>Dirección</Th>
                <Th>Teléfono</Th>
                <Th>Email</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="hover:bg-zinc-50">
                  <Td>
                    <Link
                      href={`/clientes/${cliente.id}`}
                      className="font-medium text-emerald-700 hover:underline"
                    >
                      {cliente.nombre}
                    </Link>
                  </Td>
                  <Td>
                    {cliente.cuit ?? (
                      <Badge tone="zinc">Sin CUIT</Badge>
                    )}
                  </Td>
                  <Td>
                    {[
                      cliente.direccion,
                      cliente.localidad,
                    ]
                      .filter(Boolean)
                      .join(", ") || <span className="text-zinc-400">—</span>}
                  </Td>
                  <Td>{cliente.telefono ?? <span className="text-zinc-400">—</span>}</Td>
                  <Td>{cliente.email ?? <span className="text-zinc-400">—</span>}</Td>
                  <Td className="text-right">
                    <Link
                      href={`/clientes/${cliente.id}/editar`}
                      className="text-sm font-medium text-zinc-500 hover:text-emerald-700"
                    >
                      Editar
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}