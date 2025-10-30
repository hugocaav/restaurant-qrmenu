import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { orderRequestSchema, orderStatusSchema, orderUpdateSchema, type OrderStatus } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = orderRequestSchema.parse(json);

    const { data: table, error } = await supabaseAdmin
      .from("tables")
      .select("id, restaurant_id, session_token, session_expires_at")
      .eq("id", body.tableId)
      .single();

    if (error || !table || table.restaurant_id !== body.restaurantId) {
      return NextResponse.json({ message: "Mesa no válida" }, { status: 404 });
    }

    if (!table.session_token || table.session_token !== body.sessionToken) {
      return NextResponse.json({ message: "La sesión de mesa expiró" }, { status: 403 });
    }

    if (table.session_expires_at && new Date(table.session_expires_at) < new Date()) {
      return NextResponse.json({ message: "La sesión de mesa expiró" }, { status: 403 });
    }

    const orderPayload = {
      restaurant_id: body.restaurantId,
      table_id: body.tableId,
      session_token: body.sessionToken,
      items: body.items,
      allergy_notes: body.allergyNotes ?? null,
      notes: body.notes ?? null,
      subtotal: body.subtotal,
      tax: body.tax,
      total: body.total,
    };

    const { data, error: insertError } = await supabaseAdmin
      .from("orders")
      .insert(orderPayload)
      .select("id")
      .single();

    if (insertError || !data) {
      console.error(insertError);
      return NextResponse.json({ message: "No se pudo crear el pedido" }, { status: 500 });
    }

    return NextResponse.json({ orderId: data.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Solicitud inválida" }, { status: 400 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  const status = searchParams.get("status");

  if (!restaurantId) {
    return NextResponse.json({ message: "restaurantId requerido" }, { status: 400 });
  }

  const query = supabaseAdmin
    .from("orders")
    .select("id, table_id, status, items, allergy_notes, notes, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (status) {
    const result = orderStatusSchema.safeParse(status);
    if (!result.success) {
      return NextResponse.json({ message: "Estado inválido" }, { status: 400 });
    }
    query.eq("status", result.data);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    return NextResponse.json({ message: "No se pudieron obtener los pedidos" }, { status: 500 });
  }

  return NextResponse.json({ orders: data ?? [] });
}

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["preparing"],
  preparing: ["ready"],
  ready: ["delivered"],
  delivered: [],
};

export async function PATCH(request: Request) {
  try {
    const json = await request.json();
    const body = orderUpdateSchema.parse(json);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from("orders")
      .select("id, restaurant_id, status")
      .eq("id", body.orderId)
      .single();

    if (fetchError || !existing || existing.restaurant_id !== body.restaurantId) {
      return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });
    }

    if (existing.status === body.nextStatus) {
      return NextResponse.json({ orderId: existing.id, status: existing.status }, { status: 200 });
    }

    const currentStatus = existing.status as OrderStatus;
    const nextStates = allowedTransitions[currentStatus];
    if (!nextStates.includes(body.nextStatus)) {
      return NextResponse.json(
        {
          message: "Transición de estado no permitida",
          currentStatus,
          allowedStatuses: nextStates,
        },
        { status: 400 },
      );
    }

    const { data, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ status: body.nextStatus })
      .eq("id", body.orderId)
      .select("id, status")
      .single();

    if (updateError || !data) {
      console.error(updateError);
      return NextResponse.json({ message: "No se pudo actualizar el pedido" }, { status: 500 });
    }

    return NextResponse.json({ orderId: data.id, status: data.status }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Solicitud inválida" }, { status: 400 });
  }
}
