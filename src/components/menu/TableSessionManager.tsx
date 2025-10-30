"use client";

import { useEffect } from "react";

interface TableSessionManagerProps {
  restaurantId: string;
  tableId: string;
}

const STORAGE_PREFIX = "mesalink-table-session";
const SESSION_DURATION_BUFFER = 60 * 1000; // 1 minuto de margen antes de expirar

const persistentTables =
  typeof process.env["NEXT_PUBLIC_PERSISTENT_TABLE_IDS"] === "string"
    ? process.env["NEXT_PUBLIC_PERSISTENT_TABLE_IDS"].split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

interface StoredTableSession {
  sessionToken: string;
  expiresAt: string;
  expiresAtMs: number;
}

interface EnsureTableSessionOptions {
  forceRefresh?: boolean;
  signal?: AbortSignal;
  persistent?: boolean;
}

function getStorageKey(tableId: string) {
  return `${STORAGE_PREFIX}:${tableId}`;
}

function parseExpiresAt(expiresAt: string | undefined): number | null {
  if (!expiresAt) {
    return null;
  }
  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function readStoredSession(tableId: string): StoredTableSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = window.localStorage.getItem(getStorageKey(tableId));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoredTableSession> & {
      expiresAt?: string;
      sessionToken?: string;
      expiresAtMs?: number;
    };
    if (!parsed.sessionToken || !parsed.expiresAt) {
      return null;
    }
    const expiresAtMs =
      typeof parsed.expiresAtMs === "number" && Number.isFinite(parsed.expiresAtMs)
        ? parsed.expiresAtMs
        : parseExpiresAt(parsed.expiresAt);

    if (!expiresAtMs) {
      return null;
    }

    return {
      sessionToken: parsed.sessionToken,
      expiresAt: parsed.expiresAt,
      expiresAtMs,
    };
  } catch (error) {
    console.warn("Sesión de mesa inválida", error);
    return null;
  }
}

function persistSession(tableId: string, session: { sessionToken: string; expiresAt: string }): StoredTableSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  const expiresAtMs = parseExpiresAt(session.expiresAt);
  const record: StoredTableSession = {
    sessionToken: session.sessionToken,
    expiresAt: session.expiresAt,
    expiresAtMs: expiresAtMs ?? Date.now() + SESSION_DURATION_BUFFER,
  };
  window.localStorage.setItem(getStorageKey(tableId), JSON.stringify(record));
  return record;
}

export async function ensureTableSession(
  restaurantId: string,
  tableId: string,
  options: EnsureTableSessionOptions = {},
): Promise<StoredTableSession | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = readStoredSession(tableId);
  const stillValid =
    existing && Date.now() + SESSION_DURATION_BUFFER < existing.expiresAtMs;

  if (stillValid && !options.forceRefresh) {
    return existing;
  }

  try {
    const requestInit: RequestInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, tableId, persistent: options.persistent ?? false }),
    };

    if (options.signal) {
      requestInit.signal = options.signal;
    }

    const response = await fetch("/api/tables/session", requestInit);

    if (!response.ok) {
      let errorDetails: unknown;
      try {
        errorDetails = await response.json();
      } catch {
        try {
          errorDetails = await response.text();
        } catch {
          errorDetails = undefined;
        }
      }
      console.error("No se pudo generar sesión para la mesa", response.status, errorDetails);
      return existing ?? null;
    }

    const payload = (await response.json()) as { sessionToken: string; expiresAt: string };
    if (options.signal?.aborted) {
      return null;
    }

    return persistSession(tableId, payload);
  } catch (error) {
    if (options.signal?.aborted) {
      return null;
    }
    console.error("No se pudo generar sesión para la mesa", error);
    return existing ?? null;
  }
}

export function TableSessionManager({ restaurantId, tableId }: TableSessionManagerProps) {
  useEffect(() => {
    const controller = new AbortController();
    const persistent = persistentTables.includes(tableId);
    void ensureTableSession(restaurantId, tableId, { signal: controller.signal, persistent });
    return () => controller.abort();
  }, [restaurantId, tableId]);

  return null;
}

export function getStoredSessionToken(tableId: string): string | null {
  const session = readStoredSession(tableId);
  if (!session) {
    return null;
  }
  return Date.now() < session.expiresAtMs ? session.sessionToken : null;
}
