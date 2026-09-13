import { ButtonLink } from "@/app/components/ui/form";
import { Card, PageHeader } from "@/app/components/ui/display";
import { VehiculoForm } from "@/app/components/vehiculos/CamposVehiculo";

export const metadata = { title: "Nuevo vehículo" };

export default function NuevoVehiculoPage() {
  return (
    <div>
      <PageHeader
        title="Nuevo vehículo"
        description="Registrá un vehículo de la flota para controlar kilómetros y services."
        action={
          <ButtonLink href="/vehiculos" variant="secondary">
            ← Volver a vehículos
          </ButtonLink>
        }
      />
      <Card className="max-w-2xl p-5">
        <VehiculoForm />
      </Card>
    </div>
  );
}