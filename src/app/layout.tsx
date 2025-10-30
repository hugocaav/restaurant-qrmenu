import type { Metadata } from "next";
import "./globals.css";
import { fontVariables } from "@/lib/fonts";
import { MainHeader } from "@/components/layout/MainHeader";
import { CartHydrator } from "@/components/cart/CartHydrator";
import { ServiceWorkerRegister } from "@/components/layout/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: {
    default: "MesaLink · Ordena desde tu mesa",
    template: "%s · MesaLink",
  },
  description:
    "MesaLink permite a tus clientes escanear un QR, explorar el menú y enviar pedidos directo a cocina.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <html lang="es" className="h-full">
      <body className={`${fontVariables} min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] antialiased`}>
        {supabaseScript ? <script dangerouslySetInnerHTML={{ __html: supabaseScript }} /> : null}
        <ServiceWorkerRegister />
        <CartHydrator />
        <MainHeader />
        {children}
      </body>
    </html>
  );
}
