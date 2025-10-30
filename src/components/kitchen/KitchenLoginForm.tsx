"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface KitchenLoginFormProps {
  restaurantName?: string;
  restaurantId: string;
  mode?: "kitchen" | "owner";
}

const MODES: Record<
  NonNullable<KitchenLoginFormProps["mode"]>,
  { heading: string; helper: string; roleError: string }
> = {
  kitchen: {
    heading: "Acceso cocina",
    helper: "Usa las credenciales asignadas a tu estación de cocina.",
    roleError: "Esta cuenta corresponde al propietario. Usa la opción Dueño.",
  },
  owner: {
    heading: "Acceso propietario",
    helper: "Usa las credenciales de dueño o manager para gestionar tu restaurante.",
    roleError: "Esta cuenta corresponde al equipo de cocina. Usa la opción Cocina.",
  },
};

export function KitchenLoginForm({ restaurantName, restaurantId, mode = "kitchen" }: KitchenLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "unauthorized" ? "Tu cuenta no tiene acceso a este restaurante." : null,
  );

  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const envError = useMemo(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      return "Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY antes de iniciar sesión.";
    }
    return null;
  }, [supabaseUrl, supabaseAnonKey]);

  useEffect(() => {
    if (envError) {
      setError(envError);
    }
  }, [envError]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (envError) {
      setError(envError);
      return;
    }
    setSubmitting(true);
    setError(null);

    let supabase;
    try {
      supabase = createSupabaseBrowserClient();
    } catch (err) {
      console.error("Supabase client error", err);
      setError("No se pudo inicializar la conexión con Supabase. Revisa la configuración.");
      setSubmitting(false);
      return;
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Credenciales inválidas. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("No se pudo recuperar la sesión. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users_public")
      .select("role, restaurant_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.restaurant_id !== restaurantId) {
      setError("Tu cuenta no tiene acceso a este restaurante.");
      setSubmitting(false);
      return;
    }

    if (profile.role === "kitchen") {
      if (mode !== "kitchen") {
        setError(MODES.owner.roleError);
        await supabase.auth.signOut();
        setSubmitting(false);
        return;
      }
      router.replace("/admin/kitchen");
      return;
    }

    if (profile.role === "owner" || profile.role === "manager") {
      if (mode !== "owner") {
        setError(MODES.kitchen.roleError);
        await supabase.auth.signOut();
        setSubmitting(false);
        return;
      }
      router.replace("/admin/owner");
      return;
    }

    setError("Tu cuenta no tiene permisos para ingresar.");
    setSubmitting(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-sm flex-col gap-5 rounded-3xl border border-[hsl(var(--border))] bg-white p-6 text-[hsl(var(--foreground))] shadow-[0_18px_45px_rgba(0,0,0,0.08)]"
    >
      <header className="space-y-3 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-primary">{MODES[mode].heading}</p>
        <h1 className="font-display text-2xl font-semibold">Ingresa a {restaurantName ?? "tu restaurante"}</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{MODES[mode].helper}</p>
      </header>

      <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
        Correo electrónico
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="rounded-2xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-base text-[hsl(var(--foreground))] outline-none transition focus:border-primary"
        />
      </label>

      <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
        Contraseña
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="rounded-2xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-base text-[hsl(var(--foreground))] outline-none transition focus:border-primary"
        />
      </label>

      <button
        type="submit"
        disabled={submitting || Boolean(envError)}
        className="inline-flex items-center justify-center rounded-full px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00463D] disabled:cursor-not-allowed disabled:opacity-60"
        style={{ backgroundColor: submitting || envError ? "#00463D80" : "#00463D" }}
      >
        {submitting ? "Ingresando…" : "Entrar"}
      </button>

      {error ? (
        <p className="rounded-2xl border border-red-400/40 bg-red-100 p-3 text-center text-sm text-red-700">
          {error}
        </p>
      ) : null}
    </form>
  );
}
