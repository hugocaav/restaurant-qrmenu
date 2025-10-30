"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cart-store";

interface FloatingOrderBarProps {
  labels: {
    cta: string;
    subtitle: string;
  };
  href: string;
}

export function FloatingOrderBar({ labels, href }: FloatingOrderBarProps) {
  const count = useCartStore((state) => state.getCount());

  if (count === 0) {
    return null;
  }

  return (
    <Link
      href={href}
      className="fixed inset-x-4 bottom-6 z-40 flex items-center justify-center rounded-full px-6 py-4 text-white shadow-lg transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00463D]"
      style={{ backgroundColor: "#00463D" }}
    >
      <div className="flex w-full flex-col items-center justify-center gap-1 text-center">
        <span className="text-base font-bold uppercase tracking-[0.3em]">
          {labels.cta}
        </span>
        <span className="text-xs font-normal uppercase tracking-[0.3em] text-white/80">
          {count === 1 ? "1 artículo" : `${count} artículos`}
        </span>
        {labels.subtitle ? (
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/60">
            {labels.subtitle}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
