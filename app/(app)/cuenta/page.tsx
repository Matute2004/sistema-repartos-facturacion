import { obtenerUsuarioActual } from "@/lib/auth";
import { ButtonLink } from "@/app/components/ui/form";
import { Card, PageHeader } from "@/app/components/ui/display";
import { CambiarPasswordForm } from "@/app/components/auth/CambiarPasswordForm";

export const metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const usuario = await obtenerUsuarioActual();
  // Si no hay sesión, el layout `(app)` ya redirige a /login.
  // Este guard es por si la página se accede directamente sin el layout.
  if (!usuario) return null;

  return (
    <div>
      <PageHeader
        title="Mi cuenta"
        description={`Sesión iniciada como ${usuario.nombre}.`}
        action={
          <ButtonLink href="/" variant="secondary">
            ← Volver al dashboard
          </ButtonLink>
        }
      />

      <Card className="max-w-xl p-5">
        <h2 className="text-base font-semibold text-zinc-900">
          Cambiar contraseña
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Ingresá tu contraseña actual y elegí una nueva.
        </p>
        <div className="mt-4">
          <CambiarPasswordForm />
        </div>
      </Card>
    </div>
  );
}