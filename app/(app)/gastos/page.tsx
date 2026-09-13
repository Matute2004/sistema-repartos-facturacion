import { listarGastos, totalGastos } from "@/lib/data/gastos";
import {
  CATEGORIAS_GASTO,
  ETIQUETA_CATEGORIA,
  formatFecha,
  formatPesos,
} from "@/lib/types";
import type { CategoriaGasto } from "@/lib/types";
import {
  Badge,
  Card,
  CardHeader,
  PageHeader,
  Table,
  Td,
  Th,
} from "@/app/components/ui/display";
import { GastoForm } from "@/app/components/gastos/GastoForm";
import { GastoDeleteButton } from "@/app/components/gastos/GastoDeleteButton";

export const metadata = { title: "Gastos" };

const tonoCategoria: Record<CategoriaGasto, "amber" | "sky" | "emerald" | "zinc"> = {
  combustible: "amber",
  mecanico: "sky",
  insumos: "emerald",
  otros: "zinc",
};

export default async function GastosPage() {
  const [gastos, total] = await Promise.all([listarGastos(), totalGastos()]);

  const porCategoria = CATEGORIAS_GASTO.map((categoria) => ({
    categoria,
    total: gastos
      .filter((g) => g.categoria === categoria)
      .reduce((acc, g) => acc + g.montoCentavos, 0),
  })).filter((fila) => fila.total > 0);

  return (
    <div>
      <PageHeader
        title="Gastos operativos"
        description={`${gastos.length} movimientos registrados · Total acumulado ${formatPesos(
          total,
        )}`}
      />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIAS_GASTO.map((categoria) => {
              const fila = porCategoria.find(
                (f) => f.categoria === categoria,
              );
              return (
                <Card key={categoria} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      {ETIQUETA_CATEGORIA[categoria]}
                    </p>
                    <Badge tone={tonoCategoria[categoria]}>
                      {gastos.filter((g) => g.categoria === categoria).length}
                    </Badge>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-zinc-900">
                    {formatPesos(fila?.total ?? 0)}
                  </p>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader
              title="Movimientos"
              description="Los más recientes primero, con total por categoría."
            />
            {gastos.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-zinc-500">
                Todavía no hay gastos registrados.
              </p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Fecha</Th>
                    <Th>Categoría</Th>
                    <Th>Descripción</Th>
                    <Th>Proveedor</Th>
                    <Th className="text-right">Monto</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {gastos.map((gasto) => (
                    <tr key={gasto.id} className="hover:bg-zinc-50">
                      <Td className="whitespace-nowrap">
                        {formatFecha(gasto.fecha)}
                      </Td>
                      <Td>
                        <Badge tone={tonoCategoria[gasto.categoria]}>
                          {ETIQUETA_CATEGORIA[gasto.categoria]}
                        </Badge>
                      </Td>
                      <Td>{gasto.descripcion}</Td>
                      <Td>{gasto.proveedor ?? <span className="text-zinc-400">—</span>}</Td>
                      <Td className="whitespace-nowrap text-right font-semibold text-zinc-900">
                        {formatPesos(gasto.montoCentavos)}
                      </Td>
                      <Td className="text-right">
                        <GastoDeleteButton
                          id={gasto.id}
                          descripcion={gasto.descripcion}
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader
              title="Nuevo gasto"
              description="Combustible, mecánico, insumos y otros."
            />
            <div className="p-5">
              <GastoForm />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}