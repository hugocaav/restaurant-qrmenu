"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/store/cart-store";
import { ensureTableSession, getStoredSessionToken } from "@/components/menu/TableSessionManager";
import { sanitizeOptional } from "@/lib/text-sanitizer";

interface OrderReviewProps {
  menuHref: string;
  restaurantId: string;
  tableId: string;
}

export function OrderReview({ menuHref, restaurantId, tableId }: OrderReviewProps) {
  const router = useRouter();
  const lines = useCartStore((state) => state.lines);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const total = useCartStore((state) => state.getTotal());
  const clear = useCartStore((state) => state.clear);
  const [notes, setNotes] = useState<string>("");
  const [allergy, setAllergy] = useState<string>("");
  const [confirmStep, setConfirmStep] = useState<"review" | "confirm">("review");
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== "undefined" ? !navigator.onLine : false);

  const ORDER_QUEUE_KEY = "mesalink-order-queue";

  const enqueueOrder = useCallback(
    (payload: unknown) => {
      try {
        const stored = localStorage.getItem(ORDER_QUEUE_KEY);
        const queue = stored ? (JSON.parse(stored) as unknown[]) : [];
        queue.push({ createdAt: Date.now(), payload });
        localStorage.setItem(ORDER_QUEUE_KEY, JSON.stringify(queue));
        clear();
        setSent(true);
        setConfirmStep("review");
        setErrorMessage("Pedido guardado. Lo enviaremos cuando vuelva la conexión.");
      } catch (error) {
        console.error("No se pudo guardar la orden en cola", error);
        setErrorMessage("No se pudo guardar la orden offline. Intenta de nuevo más tarde.");
      }
    },
    [clear],
  );

  const flushQueuedOrders = useCallback(async () => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(ORDER_QUEUE_KEY) : null;
    if (!stored) return;
    const queue = JSON.parse(stored) as Array<{ createdAt: number; payload: unknown }>;
    if (!queue.length) return;

    const remaining: typeof queue = [];
    for (const entry of queue) {
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry.payload),
        });
        if (!response.ok) {
          remaining.push(entry);
        }
      } catch {
        remaining.push(entry);
      }
    }

    if (remaining.length) {
      localStorage.setItem(ORDER_QUEUE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(ORDER_QUEUE_KEY);
    }
  }, []);

  const subtitleText = useMemo(() => {
    const label = lines.length === 1 ? "1 artículo" : `${lines.length} artículos`;
    return `Total $${total.toFixed(2)} MXN · ${label}`;
  }, [total, lines.length]);

  useEffect(() => {
    if (!sent) return;
    const timer = setTimeout(() => {
      setSent(false);
      router.push(menuHref);
    }, 1800);
    return () => clearTimeout(timer);
  }, [sent, router, menuHref]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOffline(false);
      void flushQueuedOrders();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) {
      setIsOffline(true);
    } else {
      void flushQueuedOrders();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushQueuedOrders]);

  const handleConfirm = async () => {
    if (lines.length === 0) return;
    if (confirmStep === "review") {
      setConfirmStep("confirm");
      return;
    }

    let sessionToken = getStoredSessionToken(tableId);
    if (!sessionToken) {
      const refreshed = await ensureTableSession(restaurantId, tableId, { forceRefresh: true });
      sessionToken = refreshed?.sessionToken ?? null;
    }

    if (!sessionToken) {
      setErrorMessage("La sesión de la mesa no se pudo renovar. Recarga el menú e inténtalo de nuevo.");
      setConfirmStep("review");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    let sanitizedAllergy: string;
    let sanitizedNotes: string;
    try {
      sanitizedAllergy = sanitizeOptional(allergy, {
        fieldLabel: "Notas de alergia",
        maxLength: 500,
      });
      sanitizedNotes = sanitizeOptional(notes, {
        fieldLabel: "Notas",
        maxLength: 500,
        allowNewlines: true,
      });
      setAllergy(sanitizedAllergy);
      setNotes(sanitizedNotes);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Revisa la información antes de enviar.");
      setIsSubmitting(false);
      setConfirmStep("review");
      return;
    }

    const payload = {
      restaurantId,
      tableId,
      sessionToken,
      items: lines.map((line) => ({
        menuItemId: line.item.id,
        name: line.item.name,
        price: line.item.price,
        quantity: line.quantity,
      })),
      allergyNotes: sanitizedAllergy.length ? sanitizedAllergy : null,
      notes: sanitizedNotes.length ? sanitizedNotes : null,
      subtotal: total,
      tax: 0,
      total,
    };

    const shouldQueue = typeof navigator !== "undefined" && !navigator.onLine;

    if (shouldQueue) {
      enqueueOrder(payload);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.json().catch(() => ({ message: "Error del servidor" }));
        setErrorMessage(message.message ?? "No se pudo enviar el pedido");
        setIsSubmitting(false);
        return;
      }

      clear();
      setNotes("");
      setAllergy("");
      setConfirmStep("review");
      setSent(true);
    } catch (error) {
      console.error(error);
      if (error instanceof TypeError) {
        enqueueOrder(payload);
      } else {
        setErrorMessage("Ocurrió un error al enviar tu pedido. Intenta de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-24 pt-8 text-center sm:px-6 font-sans">
      <header className="space-y-3">
        <h1 className="font-display text-2xl font-semibold text-[hsl(var(--foreground))]">
          Resumen de tu pedido
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">{subtitleText}</p>
        {isOffline ? (
          <p className="text-xs uppercase tracking-[0.3em] text-[#00463D]">
            Sin conexión · guardaremos tu pedido y lo enviaremos automáticamente al reconectar
          </p>
        ) : null}
      </header>

      {lines.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[hsl(var(--border))] bg-white p-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
          Tu orden está vacía. Regresa al menú para agregar productos.
        </div>
      ) : (
        <div className="space-y-4">
          {lines.map(({ item, quantity }) => (
            <div
              key={item.id}
              className="flex flex-col gap-4 rounded-3xl border border-[hsl(var(--border))] bg-white p-4 text-[hsl(var(--foreground))] sm:flex-row"
            >
              <div className="flex-1 space-y-2 text-left sm:text-left">
                <h2 className="font-display text-lg font-semibold">{item.name}</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.description}</p>
                <p className="text-sm font-medium text-[#00463D]">
                  ${(item.price * quantity).toFixed(2)} MXN
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, quantity - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white text-lg transition hover:border-primary hover:text-primary"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center text-base font-semibold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.id, quantity + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))] bg-white text-lg transition hover:border-primary hover:text-primary"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))] transition hover:text-red-500"
                >
                  quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="space-y-4 rounded-3xl border border-[hsl(var(--border))] bg-white p-5 text-left text-[hsl(var(--foreground))] sm:text-left">
        <h2 className="text-sm uppercase tracking-[0.3em] text-primary text-center">
          Confirma que todo esté correcto antes de enviar
        </h2>
        <label className="block text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
          ¿Alergias o intolerancias?
          <textarea
            value={allergy}
            onChange={(event) => setAllergy(event.target.value)}
            placeholder="Ej. sin nueces, alergia a mariscos"
            className="mt-2 w-full rounded-2xl border border-[hsl(var(--border))] bg-white p-3 text-base text-[hsl(var(--foreground))] outline-none transition focus:border-primary"
            rows={3}
            style={{ fontSize: "16px" }}
            suppressHydrationWarning
          />
        </label>
        <label className="block text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
          Notas para cocina
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Indica si quieres algo extra o modificaciones"
            className="mt-2 w-full rounded-2xl border border-[hsl(var(--border))] bg-white p-3 text-base text-[hsl(var(--foreground))] outline-none transition focus:border-primary"
            rows={4}
            style={{ fontSize: "16px" }}
            suppressHydrationWarning
          />
        </label>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={lines.length === 0 || isSubmitting}
          className={`inline-flex flex-1 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed ${
            lines.length > 0
              ? "text-white hover:brightness-110 focus-visible:outline-[#00463D]"
              : "border border-[#00463D] text-[#00463D]"
          }`}
          style={lines.length > 0 ? { backgroundColor: "#00463D" } : undefined}
        >
          {confirmStep === "review" ? "Confirmar" : isSubmitting ? "Enviando..." : "Enviar pedido"}
        </button>
        <Link
          href={menuHref}
          className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-[hsl(var(--foreground))] transition hover:border-primary hover:text-primary"
        >
          Editar items
        </Link>
      </div>

      {errorMessage && (
        <div className="rounded-3xl border border-red-400/40 bg-red-100 p-4 text-center text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {sent && (
        <div className="rounded-3xl border border-[#00463D]/40 bg-[#00463D]/10 p-4 text-center text-sm text-[#00463D]">
          Pedido enviado. Nuestro equipo está preparándolo.
        </div>
      )}

      <div className="h-16" />
    </div>
  );
}
