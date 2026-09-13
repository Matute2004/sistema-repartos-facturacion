import { listarClientes } from "@/lib/data/clientes";
import { ButtonLink } from "@/app/components/ui/form";
import { PageHeader } from "@/app/components/ui/display";
import { Card } from "@/app/components/ui/display";
import { ClientesTablaBusqueda } from "@/app/components/clientes/ClientesTablaBusqueda";
import { ImportarClientes } from "@/app/components/clientes/ImportarClientes";

export const metadata = { title: "Clientes" };

interface SearchParams {
  importado?: string;
  sinNombre?: string;
  errores?: string;
}

/** Banner verde que muestra el resultado de una importación de Excel. */
function BannerImportacion({ params }: { params: { importado: number; sinNombre: number; errores: number } }) {
  const partes: string[] = [`${params.importado} importado(s)`];
  if (params.sinNombre > 0) partes.push(`${params.sinNombre} sin nombre`);
  if (params.errores > 0) partes.push(`${params.errores} con error`);
  return (
    <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      <p className="font-medium">Importación completada</p>
      <p className="mt-0.5 text-emerald-700">
        {partes.join(", ")}. Estás viendo la lista de clientes actualizada.
      </p>
    </div>
  );
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [clientes, params] = await Promise.all([
    listarClientes(),
    searchParams,
  ]);
  const conTelefono = clientes.filter((c) => c.telefono).length;
  const importado = params.importado ? Number(params.importado) : null;

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${clientes.length} clientes registrados · ${conTelefono} con teléfono`}
        action={
          <div className="flex flex-wrap gap-2">
            <ImportarClientes />
            <ButtonLink href="/clientes/nuevo" variant="primary">
              + Nuevo cliente
            </ButtonLink>
          </div>
        }
      />

      {importado != null && (
        <BannerImportacion
          params={{
            importado,
            sinNombre: params.sinNombre ? Number(params.sinNombre) : 0,
            errores: params.errores ? Number(params.errores) : 0,
          }}
        />
      )}

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