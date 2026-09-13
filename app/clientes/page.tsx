import { listarClientes } from "@/lib/data/clientes";
import { ButtonLink } from "@/app/components/ui/form";
import { PageHeader } from "@/app/components/ui/display";
import { Card } from "@/app/components/ui/display";
import { ClientesTablaBusqueda } from "@/app/components/clientes/ClientesTablaBusqueda";

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
          <ClientesTablaBusqueda clientes={clientes} />
        )}
      </Card>
    </div>
  );
}