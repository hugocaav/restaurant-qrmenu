"use client";

import { useState } from "react";
import { KitchenLoginForm } from "@/components/kitchen/KitchenLoginForm";

interface AdminLoginPanelProps {
  restaurantId: string;
  restaurantName?: string;
}

export function AdminLoginPanel({ restaurantId, restaurantName }: AdminLoginPanelProps) {
  const resolvedName = restaurantName ?? "tu restaurante";
  const [mode, setMode] = useState<"kitchen" | "owner" | null>(null);

  if (!mode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 py-16 text-[hsl(var(--foreground))]">
        <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-2">
          <article className="rounded-3xl border border-[hsl(var(--border))] bg-white p-6 text-center shadow-sm">
            <h2 className="font-display text-xl font-semibold text-[#00463D]">Equipo de cocina</h2>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              Accede al tablero para ver pedidos en curso y avanzar su estado.
            </p>
            <button
              type="button"
              onClick={() => setMode("kitchen")}
              className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00463D]"
              style={{ backgroundColor: "#00463D" }}
            >
              Entrar a cocina
            </button>
          </article>

          <article className="rounded-3xl border border-[hsl(var(--border))] bg-white p-6 text-center shadow-sm">
            <h2 className="font-display text-xl font-semibold text-[#00463D]">Dueño / Manager</h2>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              Ingresa para editar el menú, administrar tu operación y configurar nuevas herramientas.
            </p>
            <button
              type="button"
              onClick={() => setMode("owner")}
              className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00463D]"
              style={{ backgroundColor: "#00463D" }}
            >
              Entrar como dueño
            </button>
          </article>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-16 text-[hsl(var(--foreground))]">
      <button
        type="button"
        onClick={() => setMode(null)}
        className="mb-6 self-start rounded-full border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[hsl(var(--foreground))] transition hover:border-[#00463D] hover:text-[#00463D]"
      >
        ← Cambiar de opción
      </button>
      <KitchenLoginForm restaurantId={restaurantId} restaurantName={resolvedName} mode={mode} />
    </main>
  );
}
