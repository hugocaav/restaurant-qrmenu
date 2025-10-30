"use client";

import { useState } from "react";
import { MenuImageCarousel } from "@/components/menu/MenuImageCarousel";
import type { MenuItem } from "@/store/cart-store";
import { useCartStore } from "@/store/cart-store";

interface MenuCardProps {
  item: MenuItem;
}

export function MenuCard({ item }: MenuCardProps) {
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  const increment = () => setQuantity((prev) => Math.min(prev + 1, 9));
  const decrement = () => setQuantity((prev) => Math.max(prev - 1, 1));

  const handleAddToCart = () => {
    addItem(item, quantity);
    setQuantity(1);
  };

  return (
    <article className="flex flex-col gap-6 rounded-3xl border border-[hsl(var(--border))] bg-white px-6 pb-6 pt-5 text-[hsl(var(--foreground))] shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <MenuImageCarousel images={item.images} title={item.name} />
      <div className="flex flex-col items-center gap-3 text-center">
        <h3 className="font-display text-xl font-semibold text-[#00463D]">{item.name}</h3>
        <span className="text-base font-semibold text-[#00463D]">${item.price.toFixed(2)} MXN</span>
        <p className="text-sm leading-6 text-[#00463D]/80">{item.description}</p>
        {item.allergens?.length ? (
          <p className="text-xs uppercase tracking-[0.25em] text-[#00463D]">
            Alérgenos: {item.allergens.join(", ")}
          </p>
        ) : null}
      </div>
      <div className="mt-auto flex flex-col gap-4 rounded-2xl border border-[hsl(var(--border))] bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center gap-4 sm:justify-start">
          <button
            type="button"
            onClick={decrement}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-white text-xl font-semibold text-[#00463D] transition hover:border-[#00463D] hover:text-[#00463D]"
            aria-label="Disminuir"
          >
            −
          </button>
          <span className="min-w-[2.5rem] text-center text-lg font-semibold text-[#00463D]">{quantity}</span>
          <button
            type="button"
            onClick={increment}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-white text-xl font-semibold text-[#00463D] transition hover:border-[#00463D] hover:text-[#00463D]"
            aria-label="Aumentar"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          className="inline-flex min-h-[50px] items-center justify-center rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00463D]"
          style={{ backgroundColor: "#00463D" }}
        >
          Agregar
        </button>
      </div>
    </article>
  );
}
