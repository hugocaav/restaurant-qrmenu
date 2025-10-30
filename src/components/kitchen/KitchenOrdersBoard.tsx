"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type OrderStatus = "pending" | "preparing" | "ready" | "delivered";

interface RawOrder {
  id: string;
  table_id: string;
  status: OrderStatus;
  items: unknown;
  allergy_notes: string | null;
  notes: string | null;
  created_at: string;
}

interface KitchenOrderItem {
  name: string;
  quantity: number;
}

interface KitchenOrder {
  id: string;
  tableId: string;
  status: OrderStatus;
  items: KitchenOrderItem[];
  allergyNotes: string | null;
  notes: string | null;
  createdAt: string;
}

interface KitchenOrdersBoardProps {
  restaurantId: string;
  pollIntervalMs?: number;
}

// Reducimos el polling a 12s para disminuir llamadas a /api/orders sin perder visibilidad.
const DEFAULT_POLL_INTERVAL_MS = 12_000;

const STATUS_COLUMNS: Array<{ id: OrderStatus; title: string; description: string }> = [
  {
    id: "pending",
    title: "Recibidos",
    description: "Pedidos nuevos esperando confirmación.",
  },
  {
    id: "preparing",
    title: "En preparación",
    description: "Actualmente en cocina y barra.",
  },
  {
    id: "ready",
    title: "Listos",
    description: "Enviar a mesa cuanto antes.",
  },
];

const STATUS_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: "Comenzar preparación",
  preparing: "Marcar como listo",
  ready: "Marcar como entregado",
};

const STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "preparing",
  preparing: "ready",
  ready: "delivered",
};

function parseItems(raw: unknown): KitchenOrderItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const name = typeof (item as { name?: unknown }).name === "string" ? (item as { name: string }).name : null;
      const quantity =
        typeof (item as { quantity?: unknown }).quantity === "number"
          ? (item as { quantity: number }).quantity
          : null;
      if (!name || quantity === null) {
        return null;
      }
      return { name, quantity };
    })
    .filter((item): item is KitchenOrderItem => item !== null);
}

function mapOrder(raw: RawOrder): KitchenOrder {
  return {
    id: raw.id,
    tableId: raw.table_id,
    status: raw.status,
    items: parseItems(raw.items),
    allergyNotes: raw.allergy_notes,
    notes: raw.notes,
    createdAt: raw.created_at,
  };
}

function formatElapsedMinutes(timestamp: string): string {
  const created = new Date(timestamp);
  if (Number.isNaN(created.getTime())) {
    return "Hace unos minutos";
  }
  const diffMs = Date.now() - created.getTime();
  if (diffMs < 0) {
    return "Hace unos segundos";
  }
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 1) {
    return "Hace unos segundos";
  }
  if (diffMinutes < 60) {
    const unit = diffMinutes === 1 ? "minuto" : "minutos";
    return `Hace ${diffMinutes} ${unit}`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    const unit = diffHours === 1 ? "hora" : "horas";
    return `Hace ${diffHours} ${unit}`;
  }
  const diffDays = Math.floor(diffHours / 24);
  const unit = diffDays === 1 ? "día" : "días";
  return `Hace ${diffDays} ${unit}`;
}

export function KitchenOrdersBoard({ restaurantId, pollIntervalMs = DEFAULT_POLL_INTERVAL_MS }: KitchenOrdersBoardProps) {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const groupedOrders = useMemo(() => {
    return STATUS_COLUMNS.map((column) => ({
      ...column,
      orders: orders.filter((order) => order.status === column.id),
    }));
  }, [orders]);

  const loadOrders = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`/api/orders?restaurantId=${restaurantId}`);
      const payload = (await response.json().catch(() => null)) as
        | {
            orders?: RawOrder[];
            message?: string;
          }
        | null;
      if (!response.ok) {
        throw new Error(payload?.message ?? "No se pudieron cargar los pedidos");
      }
      const mapped = (payload?.orders ?? []).map(mapOrder).filter((order) => order.status !== "delivered");
      setOrders(mapped);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudieron cargar los pedidos");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void loadOrders();

    const interval = setInterval(() => {
      void loadOrders();
    }, pollIntervalMs);

    return () => {
      clearInterval(interval);
    };
  }, [loadOrders, pollIntervalMs]);

  const handleAdvanceOrder = useCallback(
    async (order: KitchenOrder) => {
      const nextStatus = STATUS_NEXT[order.status];
      if (!nextStatus) {
        return;
      }
      setProcessingOrderId(order.id);
      setError(null);
      try {
        const response = await fetch("/api/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restaurantId,
            orderId: order.id,
            nextStatus,
          }),
        });

        if (!response.ok) {
          const detail = await response.json().catch(() => ({}));
          throw new Error(detail.message ?? "No se pudo actualizar el pedido");
        }

        await loadOrders();
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : "No se pudo actualizar el pedido");
      } finally {
        setProcessingOrderId(null);
      }
    },
    [restaurantId, loadOrders],
  );

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-12 pt-6 text-[hsl(var(--foreground))] sm:px-6">
      <header className="space-y-3 text-center sm:text-left">
        <p className="text-xs uppercase tracking-[0.35em] text-primary">Tablero de cocina</p>
        <h1 className="font-display text-3xl font-semibold">Pedidos en curso</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Revisa los pedidos entrantes, avanza su estado y mantén al equipo sincronizado.
        </p>
      </header>

      {error ? (
        <div className="rounded-3xl border border-red-400/40 bg-red-100 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading && orders.length === 0 ? (
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-white p-6 text-sm text-[hsl(var(--muted-foreground))]">
          Cargando pedidos…
        </div>
      ) : null}

      {!loading && orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[hsl(var(--border))] bg-white p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No hay pedidos en progreso. Cuando un comensal envíe su orden la verás aquí.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {groupedOrders.map((column) => (
            <section
              key={column.id}
              className="flex h-full flex-col gap-4 rounded-3xl border border-[hsl(var(--border))] bg-white p-4"
            >
              <div className="space-y-1">
                <h2 className="font-display text-lg font-semibold">{column.title}</h2>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{column.description}</p>
              </div>

              <div className="flex flex-1 flex-col gap-3">
                {column.orders.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white p-4 text-center text-xs text-[hsl(var(--muted-foreground))]">
                    Nada por ahora.
                  </p>
                ) : (
                  column.orders.map((order) => (
                    <article
                      key={order.id}
                      className="flex flex-col gap-3 rounded-2xl border border-[hsl(var(--border))] bg-white p-4 shadow-[0_18px_40px_rgba(0,0,0,0.08)]"
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-primary">
                        <span>Mesa {order.tableId.slice(0, 4)}</span>
                        <span>{formatElapsedMinutes(order.createdAt)}</span>
                      </div>
                      <ul className="space-y-2 text-sm text-[hsl(var(--foreground))]">
                        {order.items.map((item) => (
                          <li key={`${order.id}-${item.name}`} className="flex justify-between gap-3">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-primary">×{item.quantity}</span>
                          </li>
                        ))}
                      </ul>
                      {order.allergyNotes ? (
                        <p className="rounded-xl border border-amber-400/40 bg-amber-50 p-3 text-xs text-amber-700">
                          Alergias: {order.allergyNotes}
                        </p>
                      ) : null}
                      {order.notes ? (
                        <p className="rounded-xl border border-[hsl(var(--border))] bg-primary/5 p-3 text-xs text-[hsl(var(--foreground))]">
                          Nota: {order.notes}
                        </p>
                      ) : null}
                      {STATUS_ACTION_LABEL[order.status] ? (
                        <button
                          type="button"
                          onClick={() => handleAdvanceOrder(order)}
                          disabled={processingOrderId === order.id}
                          className="inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00463D] disabled:cursor-not-allowed disabled:opacity-60"
                          style={{ backgroundColor: "#00463D" }}
                        >
                          {processingOrderId === order.id ? "Actualizando…" : STATUS_ACTION_LABEL[order.status]}
                        </button>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
