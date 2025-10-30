"use client";

import { useCallback, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface OwnerTableQrGeneratorProps {
  onClose: () => void;
}

const RESTAURANT_ID = "dbd7e5cb-5b4f-416d-b1d4-5892c453b5c9";
const APP_BASE_URL = typeof window !== 'undefined' ? window.location.origin : "http://localhost:3001";

interface TableQrInfo {
  id: string;
  table_number: number;
  session_token: string;
  session_expires_at: string | null;
}

export function OwnerTableQrGenerator({ onClose }: OwnerTableQrGeneratorProps) {
  const [qrs, setQrs] = useState<TableQrInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expireInfo, setExpireInfo] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExpireInfo(null);
    try {
      const response = await fetch("/api/tables/session/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: RESTAURANT_ID }),
      });
      if (!response.ok) {
        throw new Error("No se pudieron regenerar los QR. Intenta de nuevo.");
      }
      const payload = await response.json();
      setQrs(payload.tables ?? []);
      if (payload.tables?.[0]?.session_expires_at) {
        const d = new Date(payload.tables[0].session_expires_at);
        setExpireInfo(
          `Los QR estarán activos hasta las ${d.toLocaleTimeString()} (${d.toLocaleDateString()})`
        );
      }
    } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Error al generar los QR");
        }
      } finally {
      setLoading(false);
    }
  }, []);

  // Download SVG QR code
  const handleDownload = (tableId: string) => {
    const svg = document.getElementById(`qr-svg-${tableId}`) as SVGSVGElement | null;
    if (svg) {
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(svg);
      const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const link = document.createElement("a");
      link.download = `table-qr-${tableId}.svg`;
      link.href = url;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 50);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-16 text-[hsl(var(--foreground))]">
      <div className="w-full space-y-6 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-[#009291]">Generador de QR para mesas</p>
        <h1 className="font-display text-3xl font-semibold">Genera QR seguros para cada mesa</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Da acceso temporal a tu menú de pedidos con QR únicos para usar directamente en las mesas de tu restaurante.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center rounded-full border border-[#009291] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#009291] transition hover:bg-[#e6f5f5]"
        >
          Volver al panel
        </button>
      </div>
      <div className="mt-10 flex flex-col gap-4">
        <button
          type="button"
          onClick={handleGenerate}
          className="inline-flex items-center justify-center rounded-full bg-[#009291] px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          disabled={loading}
        >
          {loading ? "Generando QRs…" : "Generar códigos QR de mesas"}
        </button>
        {expireInfo && (
          <p className="text-xs text-[#009291] font-medium">{expireInfo}</p>
        )}
        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
            {error}
          </div>
        )}
        {qrs.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2">
            {qrs.map((table) => {
              const url = `${APP_BASE_URL}/menu/${RESTAURANT_ID}/${table.table_number}?token=${table.session_token}`;
              return (
                <div
                  key={table.id}
                  className="flex flex-col items-center gap-2 rounded-3xl border border-[#009291] bg-white p-6 shadow-sm"
                >
                  <QRCodeSVG
                    id={`qr-svg-${table.id}`}
                    value={url}
                    size={156}
                    level="H"
                    includeMargin={true}
                  />
                  <div className="flex flex-col items-center gap-1 mt-2">
                    <span className="text-sm font-semibold uppercase tracking-widest text-[#009291]">
                      Mesa {table.table_number}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDownload(table.id)}
                      className="mt-2 rounded-full border border-[#009291] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#009291] transition hover:bg-[#e6f5f5]"
                    >
                      Descargar QR
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
