import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sessionRequestSchema } from "@/lib/validations";

const DEFAULT_SESSION_DURATION_MS = Number(process.env["TABLE_SESSION_DURATION_MS"] ?? 1000 * 60 * 60 * 3); // 3 hours
const DEFAULT_SESSION_RENEW_THRESHOLD_MS = Number(process.env["TABLE_SESSION_THRESHOLD_MS"] ?? 1000 * 60); // renew if <1m

const PERSISTENT_SESSION_DURATION_MS = Number(
  process.env["TABLE_SESSION_PERSISTENT_DURATION_MS"] ?? 1000 * 60 * 60 * 24 * 30,
); // 30 días
const PERSISTENT_SESSION_RENEW_THRESHOLD_MS = Number(
  process.env["TABLE_SESSION_PERSISTENT_THRESHOLD_MS"] ?? 1000 * 60 * 60,
); // renovar si falta <1h

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (!body) {
      return NextResponse.json({ message: "Solicitud vacía" }, { status: 400 });
    }

    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      return NextResponse.json({ message: "JSON inválido" }, { status: 400 });
    }

    const { restaurantId, tableId, persistent } = sessionRequestSchema.parse(json);

    const { data: table, error } = await supabaseAdmin
      .from("tables")
      .select("id, is_active")
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .single();

    if (error || !table) {
      return NextResponse.json({ message: "Mesa no encontrada" }, { status: 404 });
    }

    if (!table.is_active) {
      return NextResponse.json({ message: "Mesa inactiva" }, { status: 403 });
    }

    const durationMs = persistent ? PERSISTENT_SESSION_DURATION_MS : DEFAULT_SESSION_DURATION_MS;
    const thresholdMs = persistent ? PERSISTENT_SESSION_RENEW_THRESHOLD_MS : DEFAULT_SESSION_RENEW_THRESHOLD_MS;

    const { data, error: rpcError } = await supabaseAdmin.rpc("ensure_table_session", {
      p_table_id: tableId,
      p_restaurant_id: restaurantId,
      p_duration_ms: durationMs,
      p_threshold_ms: thresholdMs,
    });

    if (!rpcError && data) {
      const rows = Array.isArray(data) ? data : [data];
      const sessionRow = rows[0];
      if (
        sessionRow &&
        typeof sessionRow === "object" &&
        typeof (sessionRow as { session_token?: unknown }).session_token === "string" &&
        typeof (sessionRow as { session_expires_at?: unknown }).session_expires_at === "string"
      ) {
        return NextResponse.json({
          sessionToken: (sessionRow as { session_token: string }).session_token,
          expiresAt: (sessionRow as { session_expires_at: string }).session_expires_at,
        });
      }
    }

    console.warn("ensure_table_session fallback triggered", rpcError);

    const fallbackToken = randomUUID();
    const fallbackExpiresAt = new Date(Date.now() + durationMs).toISOString();

    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from("tables")
      .update({
        session_token: fallbackToken,
        session_expires_at: fallbackExpiresAt,
      })
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .select("session_token, session_expires_at")
      .single();

    if (fallbackError || !fallbackData) {
      console.error("ensure_table_session fallback error", rpcError, fallbackError);
      return NextResponse.json(
        {
          message: "No se pudo actualizar la sesión",
          detail: rpcError?.message ?? fallbackError?.message ?? null,
          hint: rpcError?.hint ?? fallbackError?.hint ?? null,
          code: rpcError?.code ?? fallbackError?.code ?? null,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      sessionToken: fallbackData.session_token,
      expiresAt: fallbackData.session_expires_at,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Solicitud inválida" }, { status: 400 });
  }
}
