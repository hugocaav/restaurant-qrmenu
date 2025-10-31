"use client";

import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function MainHeader() {
  const pathname = usePathname();
  
  // No mostrar header en rutas de admin
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <span className="font-display text-2xl font-semibold uppercase tracking-[0.35em] text-[#00463D]">
          Heca
        </span>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
