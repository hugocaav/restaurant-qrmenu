import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OrderReview } from "@/components/menu/OrderReview";
import { TableSessionManager } from "@/components/menu/TableSessionManager";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ restaurantId: string; tableId: string }>;
}) {
  const { restaurantId, tableId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: table, error } = await supabase
    .from("tables")
    .select("id, is_active")
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (error || !table || !table.is_active) {
    return (
      <main className="min-h-screen bg-white text-[hsl(var(--foreground))]">
        <section className="mx-auto w-full max-w-4xl px-4 pb-24 pt-16 text-center sm:px-6">
          <h1 className="font-display text-3xl font-semibold">Mesa no disponible</h1>
          <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
            Vuelve al inicio y escanea nuevamente el código QR.
          </p>
        </section>
      </main>
    );
  }

  const menuHref = `/menu/${restaurantId}/${tableId}`;

  return (
    <main className="min-h-screen bg-white text-[hsl(var(--foreground))]">
      <TableSessionManager restaurantId={restaurantId} tableId={tableId} />
      <div className="border-b border-[hsl(var(--border))] bg-white/95">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-6 sm:px-6">
          <Link
            href={menuHref}
            className="rounded-full border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[hsl(var(--foreground))] transition hover:border-primary hover:text-primary"
          >
            ← Editar items
          </Link>
          <p className="text-xs uppercase tracking-[0.35em] text-primary">
            Mesa {tableId.slice(0, 4)}
          </p>
        </div>
      </div>
      <OrderReview menuHref={menuHref} restaurantId={restaurantId} tableId={tableId} />
    </main>
  );
}
