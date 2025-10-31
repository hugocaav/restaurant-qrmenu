'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { locales, type Locale } from '@/i18n/config';

interface LanguageSelectorProps {
  restaurantId: string;
  tableId: string;
  restaurantName?: string;
}

export function LanguageSelector({ restaurantId, tableId, restaurantName }: LanguageSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const selectLanguage = (locale: Locale) => {
    // Guardar preferencia en localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-locale', locale);
    }
    
    // Construir URL con locale y token
    const tokenParam = token ? `?token=${token}` : '';
    // Usar replace para que no se pueda volver atrás a la selección de idioma
    router.replace(`/${locale}/menu/${restaurantId}/${tableId}${tokenParam}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#00463D]/5 via-white to-[#009291]/5 flex items-center justify-center px-4 py-16">
      <section className="w-full max-w-md space-y-8 text-center">
        {restaurantName && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-[#00463D]">Bienvenido</p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#00463D]">
              {restaurantName}
            </h1>
          </div>
        )}
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-semibold text-[#00463D] mb-2">
            Selecciona tu idioma
          </h2>
          <p className="text-sm text-gray-600">
            Choose your language
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => selectLanguage('es')}
            className="group relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-[#00463D]/20 bg-white p-8 shadow-lg transition-all hover:border-[#00463D] hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#00463D] focus:ring-offset-2"
          >
            <div className="text-6xl">🇲🇽</div>
            <span className="font-display text-xl font-semibold text-[#00463D] uppercase tracking-wider">
              Español
            </span>
          </button>
          <button
            type="button"
            onClick={() => selectLanguage('en')}
            className="group relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-[#00463D]/20 bg-white p-8 shadow-lg transition-all hover:border-[#00463D] hover:shadow-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#00463D] focus:ring-offset-2"
          >
            <div className="text-6xl">🇺🇸</div>
            <span className="font-display text-xl font-semibold text-[#00463D] uppercase tracking-wider">
              English
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}

