import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MenuClient } from "@/components/menu/MenuClient";
import type { MenuCategory, MenuItem } from "@/store/cart-store";
import {
  CATEGORY_ALIAS_MAP,
  CATEGORY_ORDER,
  LEGACY_NAME_CATEGORY_MAP,
  getCategoryMeta,
} from "@/data/menu-categories";

export default async function MenuPage({
  params,
}: {
  params: Promise<{ restaurantId: string; tableId: string }>;
}) {
  const { restaurantId, tableId } = await params;
  const supabase = await createSupabaseServerClient();

  const [restaurantResult, tableResult, menuResult] = await Promise.all([
    supabase
      .from("restaurants")
      .select("id, name")
      .eq("id", restaurantId)
      .single(),
    supabase
      .from("tables")
      .select("id, is_active")
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .single(),
    supabase
      .from("menu_items")
      .select("id, name, description, price, category, image_urls, allergens")
      .eq("restaurant_id", restaurantId)
      .eq("is_available", true)
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (restaurantResult.error || !restaurantResult.data) {
    notFound();
  }

  if (tableResult.error || !tableResult.data || !tableResult.data.is_active) {
    notFound();
  }

  if (menuResult.error) {
    console.error(menuResult.error);
    throw menuResult.error;
  }

  const itemsByCategory = new Map<MenuCategory, MenuItem[]>();
  for (const row of menuResult.data ?? []) {
    const value = row.category;
    let category: MenuCategory | null = null;
    if (value && CATEGORY_ORDER.includes(value as MenuCategory)) {
      category = value as MenuCategory;
    } else if (value && CATEGORY_ALIAS_MAP[value]) {
      category = CATEGORY_ALIAS_MAP[value];
    } else {
      const nameKey = row.name.trim().toLowerCase();
      category = LEGACY_NAME_CATEGORY_MAP[nameKey] ?? null;
    }

    if (!category) {
      console.warn("Categoría desconocida en menú", row.category, row.id);
      continue;
    }

    if (!category) {
      console.warn("Categoría desconocida en menú", row.category, row.id);
      continue;
    }
    const mapEntry = itemsByCategory.get(category) ?? [];
    mapEntry.push({
      id: row.id,
      category,
      name: row.name,
      description: row.description,
      price: Number(row.price),
      images: row.image_urls ?? [],
      allergens: row.allergens ?? [],
    });
    itemsByCategory.set(category, mapEntry);
  }

  const sections = CATEGORY_ORDER
    .map((category) => {
      const items = itemsByCategory.get(category) ?? [];
      if (items.length === 0) return null;
      const meta = getCategoryMeta(category);
      return {
        id: category,
        label: meta.label,
        description: meta.description,
        items,
      };
    })
    .filter((section): section is { id: MenuCategory; label: string; description: string; items: MenuItem[] } =>
      Boolean(section),
    );

  if (sections.length === 0) {
    return (
      <main className="min-h-screen bg-white text-[hsl(var(--foreground))]">
        <section className="mx-auto w-full max-w-4xl px-4 pb-24 pt-16 text-center sm:px-6">
          <h1 className="font-display text-3xl font-semibold">Menú en preparación</h1>
          <p className="mt-4 text-sm text-[hsl(var(--muted-foreground))]">
            Aún no hay platillos configurados. Pide a tu administrador que agregue bebidas, entradas y postres desde el
            panel.
          </p>
        </section>
      </main>
    );
  }

  return (
    <MenuClient
      restaurantId={restaurantId}
      tableId={tableId}
      restaurantName={restaurantResult.data.name}
      initialSections={sections}
    />
  );
}
