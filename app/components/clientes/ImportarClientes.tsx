"use client";

import { useActionState, useRef, useState } from "react";
import {
  importarClientesAction,
} from "@/app/actions/clientes";
import { estadoInicialImportacion } from "@/app/actions/estado";
import { Card, CardHeader, Table, Td, Th } from "@/app/components/ui/display";
import { Button, FormError } from "@/app/components/ui/form";

// ---------------------------------------------------------------------------
// Mapeo de columnas: alias (normalizados) → campo del cliente
// ---------------------------------------------------------------------------
const COLUMNAS: Array<{
  campo: string;
  alias: string[];
  etiqueta: string;
}> = [
  { campo: "numero", alias: ["n", "numero", "nro", "num", "codigo"], etiqueta: "N°" },
  { campo: "nombre", alias: ["nombre", "cliente", "razon social", "razonsocial", "empresa", "titular"], etiqueta: "Nombre" },
  { campo: "cuit", alias: ["cuit", "cuil"], etiqueta: "CUIT/CUIL" },
  { campo: "direccion", alias: ["direccion", "domicilio", "calle"], etiqueta: "Dirección" },
  { campo: "localidad", alias: ["localidad", "ciudad", "poblacion"], etiqueta: "Localidad" },
  { campo: "telefono", alias: ["telefono", "tel", "celular", "cel", "movil"], etiqueta: "Teléfono" },
  { campo: "email", alias: ["email", "correo", "mail", "e-mail"], etiqueta: "Email" },
  { campo: "notas", alias: ["notas", "observaciones", "obs"], etiqueta: "Notas" },
];

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function celdaATexto(valor: unknown): string {
  if (valor == null) return "";
  if (typeof valor === "number") {
    return Number.isInteger(valor) ? String(valor) : String(valor);
  }
  if (valor instanceof Date) {
    const a = valor.getFullYear();
    const m = String(valor.getMonth() + 1).padStart(2, "0");
    const d = String(valor.getDate()).padStart(2, "0");
    return `${a}-${m}-${d}`;
  }
  return String(valor).trim();
}

interface ResultadoParseo {
  archivo: string;
  mapa: Array<{ campo: string; etiqueta: string; columnaOriginal: string }>;
  filas: Record<string, string>[];
  totalFilas: number;
  conNombre: number;
}

async function parsearArchivo(archivo: File): Promise<ResultadoParseo> {
  const XLSX = await import("xlsx");
  const buffer = await archivo.arrayBuffer();
  const libro = XLSX.read(buffer, { type: "array" });
  const hoja = libro.Sheets[libro.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(hoja, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  // Buscar primera fila con contenido (encabezados)
  let idxEncabezados = -1;
  for (let i = 0; i < aoa.length; i++) {
    if (aoa[i].some((c) => celdaATexto(c).length > 0)) {
      idxEncabezados = i;
      break;
    }
  }
  if (idxEncabezados < 0) {
    return { archivo: archivo.name, mapa: [], filas: [], totalFilas: 0, conNombre: 0 };
  }

  const encabezados = aoa[idxEncabezados].map(celdaATexto);

  // Mapear encabezados → campos
  const mapa: ResultadoParseo["mapa"] = [];
  const indicePorCampo: Record<string, number> = {};
  for (let col = 0; col < encabezados.length; col++) {
    const norm = normalizar(encabezados[col]);
    for (const columna of COLUMNAS) {
      if (columna.alias.includes(norm)) {
        mapa.push({
          campo: columna.campo,
          etiqueta: columna.etiqueta,
          columnaOriginal: encabezados[col],
        });
        indicePorCampo[columna.campo] = col;
        break;
      }
    }
  }

  // Convertir filas de datos
  const filas: Record<string, string>[] = [];
  for (let i = idxEncabezados + 1; i < aoa.length; i++) {
    const fila = aoa[i];
    if (fila.every((c) => celdaATexto(c) === "")) continue;

    const obj: Record<string, string> = {};
    for (const entrada of mapa) {
      obj[entrada.campo] = celdaATexto(fila[indicePorCampo[entrada.campo]] ?? "");
    }
    filas.push(obj);
  }

  return {
    archivo: archivo.name,
    mapa,
    filas,
    totalFilas: filas.length,
    conNombre: filas.filter((f) => f.nombre?.trim()).length,
  };
}
// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export function ImportarClientes() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parseo, setParseo] = useState<ResultadoParseo | null>(null);
  const [parseando, setParseando] = useState(false);
  const [errorParseo, setErrorParseo] = useState<string | null>(null);
  const [estado, formAction, pending] = useActionState(
    importarClientesAction,
    estadoInicialImportacion,
  );

  async function seleccionarArchivo(archivo: File | undefined) {
    if (!archivo) return;
    setParseando(true);
    setErrorParseo(null);
    setParseo(null);
    try {
      const resultado = await parsearArchivo(archivo);
      setParseo(resultado);
    } catch (error) {
      console.error("Error al parsear archivo:", error);
      setErrorParseo(
        "No se pudo leer el archivo. Asegurate de que sea un .xlsx, .xls o .csv válido.",
      );
    } finally {
      setParseando(false);
    }
  }

  function limpiar() {
    setParseo(null);
    setErrorParseo(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const hayResultado = Boolean(estado.resumen || estado.error);
  const listoParaImportar = Boolean(
    parseo && parseo.conNombre > 0 && !hayResultado,
  );

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => inputRef.current?.click()}
        disabled={pending || parseando}
      >
        {parseando ? "Leyendo…" : "Importar"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => seleccionarArchivo(e.target.files?.[0])}
      />

      {/* El form siempre está en el DOM (oculto) hasta que hay filas para
          importar; así el server action queda disponible y es accesible. */}
      <form action={formAction} hidden={!listoParaImportar}>
        <input
          type="hidden"
          name="filas"
          value={listoParaImportar ? JSON.stringify(parseo?.filas ?? []) : ""}
        />
        <Button type="submit" disabled={pending}>
          {pending
            ? "Importando…"
            : `Importar ${parseo?.conNombre ?? 0} cliente(s)`}
        </Button>
      </form>

      {(parseo || errorParseo || hayResultado) && (
        <Card className="mt-4 max-w-3xl">
          <CardHeader
            title="Importar clientes desde Excel"
            description={
              parseo
                ? `Archivo: ${parseo.archivo} — ${parseo.conNombre} filas con nombre de ${parseo.totalFilas} totales`
                : undefined
            }
          />

          {errorParseo && (
            <div className="px-5 py-3">
              <FormError message={errorParseo} />
            </div>
          )}

          {!errorParseo && estado.error && (
            <div className="px-5 py-3">
              <FormError message={estado.error} />
            </div>
          )}

          {parseo && parseo.mapa.length === 0 && (
            <p className="px-5 py-4 text-sm text-zinc-500">
              No se detectaron columnas reconocibles. Revisá que la primera fila
              tenga encabezados como Nombre, CUIT, etc.
            </p>
          )}

          {parseo && parseo.mapa.length > 0 && (
            <>
              <div className="border-b border-zinc-100 px-5 py-3">
                <p className="text-xs font-medium text-zinc-500">
                  Columnas detectadas:{" "}
                  {parseo.mapa.map((m) => m.etiqueta).join(", ")}
                </p>
              </div>

              {parseo.filas.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        {parseo.mapa.map((m) => (
                          <Th key={m.campo}>{m.etiqueta}</Th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {parseo.filas.slice(0, 8).map((fila, i) => (
                        <tr key={i} className="hover:bg-zinc-50">
                          {parseo.mapa.map((m) => (
                            <Td key={m.campo} className="max-w-[200px] truncate text-sm">
                              {fila[m.campo] || <span className="text-zinc-400">—</span>}
                            </Td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {parseo.filas.length > 8 && (
                    <p className="px-5 py-2 text-xs text-zinc-400">
                      … y {parseo.filas.length - 8} filas más
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 border-t border-zinc-100 px-5 py-3">
                {hayResultado ? (
                  <Button variant="secondary" onClick={limpiar}>
                    Importar más
                  </Button>
                ) : (
                  <Button variant="ghost" onClick={limpiar}>
                    Cancelar
                  </Button>
                )}
              </div>
            </>
          )}

          {parseo && parseo.conNombre === 0 && parseo.totalFilas > 0 && (
            <p className="px-5 py-4 text-sm text-zinc-500">
              Se encontraron {parseo.totalFilas} filas pero ninguna con la
              columna <strong>Nombre</strong>, que es obligatoria.
            </p>
          )}
        </Card>
      )}
    </>
  );
}