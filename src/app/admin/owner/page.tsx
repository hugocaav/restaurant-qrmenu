"use client";

import { useState } from "react";
import { OwnerMenuManager } from "@/components/owner/OwnerMenuManager";
import { OwnerTableQrGenerator } from "@/components/owner/OwnerTableQrGenerator";

const OWNER_PANEL_ACTIONS = [
  {
    key: "menu",
    label: "Editar menú",
    color: "#00463D",
  },
  {
    key: "qr",
    label: "Generar QR de mesas",
    color: "#009291",
  },
] as const;

type Panel = typeof OWNER_PANEL_ACTIONS[number]["key"] | null;

export default function OwnerDashboardPage() {
  const [panel, setPanel] = useState<Panel>(null);

  if (!panel) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-16 text-[hsl(var(--foreground))]">
        <div className="w-full max-w-xl space-y-6 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-[#00463D]">Panel del propietario</p>
          <h1 className="font-display text-3xl font-semibold">Elige una acción</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Gestiona tu menú, administra tu operación y agrega nuevas herramientas a medida que crece tu restaurante.
          </p>
          <div className="flex justify-center gap-3">
            {OWNER_PANEL_ACTIONS.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => setPanel(action.key)}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: action.color }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Now, select proper panel component
  if (panel === "menu") {
    return <OwnerMenuManager onClose={() => setPanel(null)} />;
  }
  if (panel === "qr") {
    return <OwnerTableQrGenerator onClose={() => setPanel(null)} />;
  }

  return null;
}
