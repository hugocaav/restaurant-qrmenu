import type { Metadata } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { MainHeader } from "@/components/layout/MainHeader";
import { CartHydrator } from "@/components/cart/CartHydrator";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { defaultLocale } from '@/i18n/config';

export const metadata: Metadata = {
  title: {
    default: "MesaLink · Ordena desde tu mesa",
    template: "%s · MesaLink",
  },
  description:
    "MesaLink permite a tus clientes escanear un QR, explorar el menú y enviar pedidos directo a cocina.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = defaultLocale;
  const messages = await getMessages();
  
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  const supabaseScript =
    supabaseUrl && supabaseAnonKey
      ? `window.__SUPABASE_CONFIG__ = ${JSON.stringify({
          url: supabaseUrl,
          anonKey: supabaseAnonKey,
        })};`
      : null;

  return (
    <html lang={locale} className="h-full">
      <body className={`${fontVariables} min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] antialiased`}>
        {supabaseScript ? <script dangerouslySetInnerHTML={{ __html: supabaseScript }} /> : null}
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ServiceWorkerRegister />
          <CartHydrator />
          <MainHeader />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
