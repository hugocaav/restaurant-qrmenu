"use client";

import { Fragment, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import clsx from "clsx";
import type { MenuCategory } from "@/store/cart-store";

interface MenuCategoryTabsProps {
  sections: Array<{ id: MenuCategory; label: string; description?: string }>;
}

export function MenuCategoryTabs({ sections }: MenuCategoryTabsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const safeSections = useMemo(
    () =>
      sections.map((section) => ({
        id: section.id,
        label: section.label,
      })),
    [sections],
  );

  if (safeSections.length === 0) {
    return null;
  }

  const handleSelect = (sectionId: MenuCategory) => {
    const anchor = document.getElementById(`section-${sectionId}`);
    anchor?.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsOpen(false);
  };

  return (
    <div className="sticky top-16 z-30 bg-white/95 backdrop-blur">
      {/* Botón visible solo en móvil */}
      <div className="flex justify-center px-4 pb-3 pt-3 sm:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex min-h-[46px] items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2 text-sm font-semibold uppercase tracking-[0.35em] text-gray-900 shadow-md transition hover:border-primary hover:text-primary"
        >
          <span aria-hidden>☰</span>
          Nuestro menú
        </button>
      </div>

      {/* Chips desktop (opcional, puedes quitar si quieres solo móvil) */}
      <div className="hidden gap-3 overflow-x-auto px-4 pb-3 sm:flex">
        {safeSections.map((s) => (
          <button
            key={s.id}
            onClick={() => handleSelect(s.id)}
            className={clsx(
              "whitespace-nowrap rounded-full border border-gray-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-800 transition hover:border-primary hover:text-primary"
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Drawer inferior a media altura */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 sm:hidden" onClose={() => setIsOpen(false)}>
          {/* Fondo oscuro semitransparente */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
          </Transition.Child>

          {/* Contenedor inferior */}
          <div className="fixed inset-x-0 bottom-0 flex items-end">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="translate-y-full"
              enterTo="translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="translate-y-0"
              leaveTo="translate-y-full"
            >
              {/* Panel que ocupa la mitad inferior */}
              <Dialog.Panel className="h-[50vh] w-full rounded-t-3xl bg-primary p-6 text-white shadow-[0_-8px_30px_rgba(0,0,0,0.25)]">
                <div className="flex flex-col gap-4 font-display text-lg font-bold uppercase tracking-wide">
                  {safeSections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelect(s.id)}
                      className="rounded-xl py-3 text-left hover:bg-white/10 transition"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
