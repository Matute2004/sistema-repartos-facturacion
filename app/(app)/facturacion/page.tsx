import { Card, PageHeader } from "@/app/components/ui/display";

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
    </div>
  );
}