import Link from "next/link";
import { Card } from "@/app/components/ui/display";
import {
  fechaHoyLocal,
  formatFecha,
  mesLegible,
  sumarMeses,
} from "@/lib/types";

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

function tituloDia(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(anio, mes - 1, dia, 12));
}

/**
 * Calendario mensual de la Hoja de Ruta. Muestra el mes del día seleccionado,
 * permite saltar de mes con «← / →» y tocar cualquier día para abrir su hoja
 * de ruta. No lleva estado: navega con links a `?fecha=YYYY-MM-DD` y el mes
 * que se ve es siempre el mes al que pertenece la fecha elegida.
 */
export function CalendarioHojaRuta({
  fecha,
  diasConRepartos,
}: {
  /** Día seleccionado (YYYY-MM-DD): su mes define qué mes se muestra. */
  fecha: string;
  /** Fechas del mes que tienen al menos un reparto. */
  diasConRepartos: string[];
}) {
  const hoy = fechaHoyLocal();
  const mes = fecha.slice(0, 7);
  const mesAnterior = sumarMeses(mes, -1);
  const mesSiguiente = sumarMeses(mes, 1);
  const conRepartos = new Set(diasConRepartos);

  const [anio, numeroMes] = mes.split("-").map(Number);
  // La semana arranca en lunes (getDay() devuelve 0=domingo).
  const celdasVacias = (new Date(anio, numeroMes - 1, 1).getDay() + 6) % 7;
  const diasEnMes = new Date(anio, numeroMes, 0).getDate();

  const celdas: Array<string | null> = [
    ...Array<string | null>(celdasVacias).fill(null),
  ];
  for (let dia = 1; dia <= diasEnMes; dia += 1) {
    celdas.push(`${mes}-${String(dia).padStart(2, "0")}`);
  }

  return (
    <Card className="mb-4 p-4 sm:p-5">
      {/* Cabecera del mes: navegación entre meses + salto a hoy */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/repartos?fecha=${mesAnterior}-01`}
          aria-label={`Ver el mes anterior (${mesLegible(mesAnterior)})`}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          ← {mesLegible(mesAnterior)}
        </Link>

        <div className="min-w-0 text-center">
          <p className="truncate text-base font-bold capitalize tracking-tight text-zinc-900">
            {mesLegible(mes)}
          </p>
          <Link
            href="/repartos"
            className="mt-0.5 inline-block text-xs font-medium text-emerald-700 underline-offset-2 hover:underline"
          >
            Ir al día de hoy ({formatFecha(hoy)})
          </Link>
        </div>

        <Link
          href={`/repartos?fecha=${mesSiguiente}-01`}
          aria-label={`Ver el mes siguiente (${mesLegible(mesSiguiente)})`}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          {mesLegible(mesSiguiente)} →
        </Link>
      </div>

      {/* Grilla del mes */}
      <div className="mt-4 grid grid-cols-7 gap-1">
        {DIAS_SEMANA.map((dia) => (
          <div
            key={dia}
            className="pb-1 text-center text-xs font-semibold uppercase tracking-wide text-zinc-400"
          >
            {dia}
          </div>
        ))}

        {celdas.map((fechaDia, indice) =>
          fechaDia ? (
            <DiaDelCalendario
              key={fechaDia}
              fecha={fechaDia}
              seleccionado={fechaDia === fecha}
              esHoy={fechaDia === hoy}
              tieneRepartos={conRepartos.has(fechaDia)}
            />
          ) : (
            <div key={`vacio-${indice}`} />
          ),
        )}
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Día con repartos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-emerald-600" />
          Día elegido
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full border-2 border-emerald-500" />
          Hoy
        </span>
      </div>
    </Card>
  );
}

function DiaDelCalendario({
  fecha,
  seleccionado,
  esHoy,
  tieneRepartos,
}: {
  fecha: string;
  seleccionado: boolean;
  esHoy: boolean;
  tieneRepartos: boolean;
}) {
  const dia = Number(fecha.slice(-2));
  const base =
    "relative flex h-10 flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition-colors";
  const estilo = seleccionado
    ? "bg-emerald-600 font-bold text-white hover:bg-emerald-700"
    : esHoy
      ? "font-bold text-emerald-700 ring-2 ring-emerald-500 ring-offset-1 hover:bg-emerald-50"
      : "text-zinc-700 hover:bg-zinc-100";

  return (
    <Link
      href={`/repartos?fecha=${fecha}`}
      aria-label={`Hoja de ruta del ${tituloDia(fecha)}`}
      aria-current={seleccionado ? "date" : undefined}
      className={`${base} ${estilo}`}
    >
      <span className="leading-none">{dia}</span>
      {tieneRepartos && (
        <span
          className={`size-1 rounded-full ${seleccionado ? "bg-white" : "bg-emerald-500"}`}
          aria-hidden="true"
        />
      )}
    </Link>
  );
}