"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface KitchenHeaderProps {
  fullName: string;
}

export function KitchenHeader({ fullName }: KitchenHeaderProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
  };

  return (
    <header className="border-b border-[hsl(var(--border))] bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 text-[hsl(var(--foreground))] sm:px-6">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-[0.35em] text-primary">Heca · Cocina</span>
          <span className="text-sm font-medium">{fullName}</span>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="rounded-full border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[hsl(var(--foreground))] transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:text-[hsl(var(--muted-foreground))]"
        >
          {signingOut ? "Cerrando…" : "Cerrar sesión"}
        </button>
      </div>
    </header>
  );
}
