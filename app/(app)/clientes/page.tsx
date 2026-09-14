import { Suspense, use } from "react";
import { listarClientesResumen } from "@/lib/data/clientes";
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

export default function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = use(searchParams);
  const importado = params.importado ? Number(params.importado) : null;

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Base de clientes registrada con su deuda acumulada."
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
        {/* La tabla consulta la deuda de todos los clientes: streama aparte
            para que el resto de la página aparezca de inmediato. */}
        <Suspense
          fallback={
            <div className="animate-pulse p-5">
              <div className="mb-4 h-4 w-56 rounded bg-zinc-200" />
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-6 border-t border-zinc-100 py-3"
                >
                  <div className="h-4 w-40 rounded bg-zinc-100" />
                  <div className="h-4 w-24 rounded bg-zinc-100" />
                  <div className="h-4 w-32 rounded bg-zinc-100" />
                  <div className="h-4 w-20 rounded bg-zinc-100" />
                </div>
              ))}
            </div>
          }
        >
          <TablaClientes />
        </Suspense>
      </Card>
    </div>
  );
}

/** Carga los clientes con su deuda y arma la tabla con búsqueda y orden. */
async function TablaClientes() {
  const clientes = await listarClientesResumen();
  if (clientes.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm font-medium text-zinc-700">
          Todavía no hay clientes
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Cargá tu primer cliente para empezar a armar remitos.
        </p>
        <div className="mt-4">
          <ButtonLink href="/clientes/nuevo" variant="primary">
            + Nuevo cliente
          </ButtonLink>
        </div>
      </div>
    );
  }
  return <ClientesTablaBusqueda clientes={clientes} />;
}