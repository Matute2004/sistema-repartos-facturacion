import Link from "next/link";
import { ButtonLink } from "@/app/components/ui/form";
import { Card, PageHeader } from "@/app/components/ui/display";
import { RemitoForm } from "@/app/components/remitos/RemitoForm";
import { listarClientes } from "@/lib/data/clientes";
import { proximoNumeroRemito } from "@/lib/data/remitos";

export const metadata = { title: "Nuevo remito" };

export default async function NuevoRemitoPage() {
  const [clientes, numeroProximo] = await Promise.all([
    listarClientes(),
    proximoNumeroRemito(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Nuevo remito"
        description="Emití el comprobante con el detalle de la mercadería."
        action={
          <ButtonLink href="/remitos" variant="ghost">
            ← Volver a remitos
          </ButtonLink>
        }
      />

      <Card className="p-5">
        {clientes.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
            Primero tenés que dar de alta al menos un cliente.{" "}
            <Link href="/clientes/nuevo" className="font-semibold underline">
              Crear cliente
            </Link>
          </div>
        ) : (
          <RemitoForm clientes={clientes} numeroProximo={numeroProximo} />
        )}
      </Card>
    </div>
  );
}