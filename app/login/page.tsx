import { redirect } from "next/navigation";
import Image from "next/image";
import { obtenerUsuarioActual } from "@/lib/auth";
import { Card, CardHeader } from "@/app/components/ui/display";
import { LoginForm } from "@/app/components/auth/LoginForm";

export const metadata = { title: "Ingresar" };

export default async function LoginPage() {
  const usuario = await obtenerUsuarioActual();
  if (usuario) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Image
            src="/ohana.jpeg"
            alt="Logo Ohana"
            width={80}
            height={80}
            priority
            className="mx-auto size-20 rounded-2xl object-cover shadow-sm"
          />
          <h1 className="mt-4 text-xl font-bold tracking-tight text-zinc-900">
            Ohana Comisiones
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Ingresá para gestionar clientes, repartos, remitos y más.
          </p>
        </div>

        <Card className="p-5">
          <CardHeader title="Iniciar sesión" />
          <div className="px-5 pb-5 pt-4">
            <LoginForm />
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-zinc-400">
          ¿Primera vez? Usuarios iniciales: <strong>Matute</strong> y{" "}
          <strong>OhanaTeam</strong> (contraseña inicial igual al nombre de
          usuario).
        </p>
      </div>
    </div>
  );
}