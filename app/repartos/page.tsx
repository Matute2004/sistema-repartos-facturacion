import { listarRepartos } from "@/lib/data/repartos";
import { formatFecha } from "@/lib/types";
import Link from "next/link";
import { ButtonLink } from "@/app/components/ui/form";
import {
  Badge,
  Card,
  CardHeader,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/app/components/ui/display";
import {
  ETIQUETA_ESTADO_REPARTO,
  TONE_ESTADO_REPARTO,
} from "@/lib/estados";

export const metadata = { title: "Repartos" };

export default async function RepartosPage() {
  const repartos = await listarRepartos();

  return (
    <div>
      <PageHeader
        title="Repartos"
        description="Hojas de ruta diarias: asigná remitos a cada reparto."
        action={
          <ButtonLink href="/repartos/nuevo" variant="primary">
            + Crear reparto
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader
          title="Repartos registrados"
          description="Tocá la fecha para ver el detalle, cambiar el estado o asignar remitos."
        />
        {repartos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-zinc-500">
            Todavía no hay repartos. El alta de repartos se habilita en la
            siguiente etapa.
          </p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Estado</Th>
                <Th>Chofer</Th>
                <Th>Vehículo</Th>
                <Th>Notas</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {repartos.map((reparto) => (
                <tr key={reparto.id} className="hover:bg-zinc-50">
                  <Td className="whitespace-nowrap">
                    <Link
                      href={`/repartos/${reparto.id}`}
                      className="font-semibold text-emerald-700 underline-offset-2 hover:underline"
                    >
                      {formatFecha(reparto.fecha)}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={TONE_ESTADO_REPARTO[reparto.estado]}>
                      {ETIQUETA_ESTADO_REPARTO[reparto.estado]}
                    </Badge>
                  </Td>
                  <Td>{reparto.chofer ?? <span className="text-zinc-400">—</span>}</Td>
                  <Td>{reparto.vehiculo ?? <span className="text-zinc-400">—</span>}</Td>
                  <Td>{reparto.notas ?? <span className="text-zinc-400">—</span>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}