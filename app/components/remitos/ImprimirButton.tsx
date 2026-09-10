"use client";

import { Button } from "@/app/components/ui/form";

export function ImprimirButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()}>
      🖨 Imprimir / Guardar PDF
    </Button>
  );
}