'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LanguageSelector } from './LanguageSelector';
import type { MenuCategory, MenuItem } from '@/store/cart-store';

interface MenuPageWrapperProps {
  restaurantId: string;
  tableId: string;
  restaurantName: string;
  initialSections: Array<{
    id: MenuCategory;
    label: string;
    description: string;
    items: MenuItem[];
  }>;
  MenuClientComponent: React.ComponentType<{
    restaurantId: string;
    tableId: string;
    restaurantName: string;
    initialSections: Array<{
      id: MenuCategory;
      label: string;
      description: string;
      items: MenuItem[];
    }>;
  }>;
}

export function MenuPageWrapper({
  restaurantId,
  tableId,
  restaurantName,
  initialSections,
  MenuClientComponent,
}: MenuPageWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hasLocale, setHasLocale] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Verificar si hay locale guardado en localStorage
    const savedLocale = typeof window !== 'undefined' 
      ? localStorage.getItem('preferred-locale')
      : null;
    
    // También verificar si la URL ya tiene un locale
    const currentPath = window.location.pathname;
    const hasLocaleInPath = currentPath.includes('/es/') || currentPath.includes('/en/');
    
    if (savedLocale || hasLocaleInPath) {
      setHasLocale(true);
    } else {
      setHasLocale(false);
    }
  }, []);

  // Mostrar loading mientras verificamos
  if (!mounted || hasLocale === null) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#00463D]">Cargando...</p>
        </div>
      </main>
    );
  }

  // Si no hay locale guardado, mostrar selector de idioma
  if (!hasLocale) {
    return (
      <LanguageSelector
        restaurantId={restaurantId}
        tableId={tableId}
        restaurantName={restaurantName}
      />
    );
  }

  // Si ya hay locale, mostrar el menú normal
  return (
    <MenuClientComponent
      restaurantId={restaurantId}
      tableId={tableId}
      restaurantName={restaurantName}
      initialSections={initialSections}
    />
  );
}

