'use client';

import { usePathname, useRouter } from 'next/navigation';
import { locales, defaultLocale, type Locale } from '@/i18n/config';

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  // Obtener locale actual desde pathname o usar defaultLocale
  const getCurrentLocale = (): Locale => {
    if (!pathname) return defaultLocale;
    const segments = pathname.split('/');
    const firstSegment = segments[1];
    if (locales.includes(firstSegment as Locale)) {
      return firstSegment as Locale;
    }
    return defaultLocale;
  };

  const locale = getCurrentLocale();

  const switchLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;
    
    if (!pathname) return;
    
    // Remove current locale from pathname if it exists
    let pathWithoutLocale = pathname;
    if (locales.includes(pathname.split('/')[1] as Locale)) {
      pathWithoutLocale = '/' + pathname.split('/').slice(2).join('/');
    }
    
    if (pathWithoutLocale === '/') {
      pathWithoutLocale = '';
    }
    
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    
    router.push(newPath);
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => switchLocale(loc)}
          className={`px-3 py-1 rounded-full text-sm font-semibold uppercase transition ${
            locale === loc
              ? 'bg-[#00463D] text-white'
              : 'bg-white text-[#00463D] border border-[#00463D] hover:bg-[#00463D]/10'
          }`}
        >
          {loc === 'es' ? 'ES' : 'EN'}
        </button>
      ))}
    </div>
  );
}

