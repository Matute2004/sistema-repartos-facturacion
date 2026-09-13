import {
  Card,
  CardHeader,
  PageHeader,
} from "@/app/components/ui/display";

export const metadata = { title: "Facturación" };

const enlacesAfip = [
  {
    url: "https://auth.afip.gob.ar/sitioexterno/",
    titulo: "Portal AFIP",
    descripcion: "Ingresar al portal del contribuyente.",
  },
  {
    url: "https://monotributo.afip.gob.ar/",
    titulo: "Monotributo",
    descripcion: "Pagos, categorías y constancias.",
  },
  {
    url: "https://wspn.afip.gob.ar/sitioexterno/",
    titulo: "Comprobantes en línea",
    descripcion: "Facturación electrónica de comprobantes.",
  },
];

export default function FacturacionPage() {
  return (
    <div>
      <PageHeader
        title="Facturación"
        description="Atajos a los servicios de AFIP para facturar."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enlacesAfip.map((enlace) => (
          <a
            key={enlace.url}
            href={enlace.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Card className="h-full p-5 transition-colors hover:border-emerald-300 hover:shadow-md">
              <p className="text-base font-semibold text-zinc-900">
                {enlace.titulo}
              </p>
              <p className="mt-1 text-sm text-zinc-500">{enlace.descripcion}</p>
              <p className="mt-3 text-sm font-medium text-emerald-700">
                Abrir en nueva pestaña →
              </p>
            </Card>
          </a>
        ))}
      </div>

      <Card className="mt-6 max-w-3xl">
        <CardHeader
          title="Siguiente etapa"
          description="Plan para la integración con la facturación"
        />
        <div className="space-y-3 px-5 py-4 text-sm text-zinc-600">
          <p>
            Este módulo va a dejar de ser solo un atajo: se va a poder partir
            desde un remito para abrir el sistema de comprobantes de AFIP con
            los datos del cliente precargados.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Atajo por remito: botón <em>“Facturar”</em> en cada remito con
              todos los datos listos para copiar al sistema de AFIP.
            </li>
            <li>
              Si el comercio lo requiere más adelante: conexión vía Web Services
              (WSAA/wcf) para emisión desde acá — requiere credenciales e IRC.
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}