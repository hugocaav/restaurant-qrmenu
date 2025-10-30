"use client";

import { useEffect, useMemo, useState } from "react";
import { MenuCategoryTabs } from "@/components/menu/MenuCategoryTabs";
import { MenuCard } from "@/components/menu/MenuCard";
import { FloatingOrderBar } from "@/components/menu/FloatingOrderBar";
import { TableSessionManager } from "@/components/menu/TableSessionManager";
import type { MenuCategory, MenuItem } from "@/store/cart-store";

interface MenuSection {
  id: MenuCategory;
  label: string;
  description: string;
  items: MenuItem[];
}

interface MenuClientProps {
  restaurantId: string;
  tableId: string;
  restaurantName: string;
  initialSections: MenuSection[];
}

const MENU_CACHE_KEY = (restaurantId: string) => `mesalink-menu-${restaurantId}`;

export function MenuClient({
  restaurantId,
  tableId,
  restaurantName,
  initialSections,
}: MenuClientProps) {
  const [sections, setSections] = useState<MenuSection[]>(initialSections);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const hasItems = sections.some((section) => section.items.length > 0);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      const cacheKey = MENU_CACHE_KEY(restaurantId);
      if (initialSections.length) {
        const payload = { updatedAt: Date.now(), sections: initialSections };
        try {
          localStorage.setItem(cacheKey, JSON.stringify(payload));
        } catch (error) {
          console.warn("No se pudo guardar el menú en caché", error);
        }
      } else {
        try {
          const cachedRaw = localStorage.getItem(cacheKey);
          if (cachedRaw) {
            const cached = JSON.parse(cachedRaw) as { sections?: MenuSection[] };
            if (cached.sections?.length) {
              setSections(cached.sections);
            }
          }
        } catch (error) {
          console.warn("No se pudo leer el menú en caché", error);
        }
      }
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [initialSections, restaurantId]);

  const orderHref = `/menu/${restaurantId}/${tableId}/order`;

  return (
    <main className="min-h-screen bg-white pb-32 text-[hsl(var(--foreground))]">
      <TableSessionManager restaurantId={restaurantId} tableId={tableId} />

      <section className="mx-auto w-full max-w-4xl px-4 pt-12 pb-6 text-center sm:px-6">
        <p className="text-xs uppercase tracking-[0.4em] text-primary">
          Mesa {tableId.slice(0, 4)} · QR activo
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold text-[#00463D] sm:text-5xl">
          {restaurantName}
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-[hsl(var(--muted-foreground))] sm:text-lg">
          Elige tus platillos y bebidas. Cuando confirmes la orden la
          recibiremos en cocina al instante.
        </p>
        {isOffline ? (
          <p className="mt-3 text-sm text-[#00463D]">
            Estás sin conexión. Mostrando el menú guardado.
          </p>
        ) : null}
      </section>

      <MenuCategoryTabs
        sections={sections.map((section) => ({
          id: section.id,
          label: section.label,
          description: section.description,
        }))}
      />

      <section className="mx-auto mt-6 w-full max-w-5xl space-y-10 px-4 sm:px-6">
        {sections.map((section) => (
          <section
            key={section.id}
            id={`section-${section.id}`}
            className="scroll-mt-28 space-y-6"
          >
            <div className="space-y-2 text-center">
              <h2 className="font-display text-3xl font-semibold text-[#00463D] sm:text-4xl">
                {section.label}
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-[hsl(var(--muted-foreground))] sm:text-base">
                {section.description}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {section.items.map((item) => (
                <MenuCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </section>

      <FloatingOrderBar
        labels={{
          cta: "REVISAR ORDEN",
          subtitle: "Confirmación en 2 pasos",
        }}
        href={orderHref}
      />

      {!hasItems ? (
        <section className="mx-auto mt-12 w-full max-w-4xl px-4 pb-16 text-center text-sm text-[hsl(var(--muted-foreground))]">
          No pudimos cargar el menú. Intenta recargar cuando vuelvas a tener
          conexión.
        </section>
      ) : null}
    </main>
  );
}