import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerRestaurantId } from "@/lib/kitchen-config";
import { CATEGORY_DB_VALUE } from "@/data/menu-categories";
import type { Database } from "@/types/database";
import type { MenuCategory } from "@/store/cart-store";

const allowedRoles = new Set(["owner", "manager"]);

const categorySchema = z.enum([
  "nonAlcoholic",
  "mixology",
  "entradas",
  "platosFuertes",
  "postres",
] as [MenuCategory, ...MenuCategory[]]);

const payloadSchema = z.object({
  name: z.string().min(2).max(120).transform((value) => value.trim()),
  description: z.string().min(10).max(600).transform((value) => value.trim()),
  price: z.number().nonnegative().max(99999),
  category: categorySchema,
  imageUrls: z
    .array(z.string().trim())
    .max(6)
    .transform((values) => values.map((value) => value.trim()).filter((value) => value.length > 0)),
  allergens: z
    .array(z.string().trim().min(1).max(60))
    .max(10)
    .optional()
    .transform((values) => values ?? []),
});

async function getAuthorizedProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, restaurantId: null };
  }

  const { data: profile } = await supabase
    .from("users_public")
    .select("role, restaurant_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { user: null, restaurantId: null };
  }

  if (!allowedRoles.has(profile.role)) {
    return { user: null, restaurantId: null };
  }

  const expectedRestaurantId = getOwnerRestaurantId();
  if (!profile.restaurant_id || profile.restaurant_id !== expectedRestaurantId) {
    return { user: null, restaurantId: null };
  }

  return { user, restaurantId: profile.restaurant_id };
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const { user, restaurantId } = await getAuthorizedProfile();
  if (!user || !restaurantId) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { itemId } = await context.params;
  if (!itemId) {
    return NextResponse.json({ message: "Identificador inválido" }, { status: 400 });
  }

  try {
    const json = await request.json();
    const parsed = payloadSchema.parse(json);
    const dbCategory = CATEGORY_DB_VALUE[parsed.category] as Database["public"]["Tables"]["menu_items"]["Update"]["category"] | undefined;

    if (!dbCategory) {
      return NextResponse.json({ message: "Categoría inválida" }, { status: 400 });
    }

    const updatePayload: Database["public"]["Tables"]["menu_items"]["Update"] = {
      name: parsed.name,
      description: parsed.description,
      price: parsed.price,
      category: dbCategory,
      image_urls: parsed.imageUrls,
      allergens: parsed.allergens,
    };

    const { data, error } = await supabaseAdmin
      .from("menu_items")
      .update(updatePayload)
      .eq("id", itemId)
      .eq("restaurant_id", restaurantId)
      .select("id")
      .single();

    if (error || !data) {
      console.error("Failed to update menu item", error);
      return NextResponse.json({ message: "No se pudo actualizar el platillo" }, { status: 500 });
    }

    return NextResponse.json({ id: data.id }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", issues: error.flatten() }, { status: 400 });
    }
    console.error("Unexpected error updating menu item", error);
    return NextResponse.json({ message: "No se pudo actualizar el platillo" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ itemId: string }> }) {
  const { user, restaurantId } = await getAuthorizedProfile();
  if (!user || !restaurantId) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { itemId } = await context.params;
  if (!itemId) {
    return NextResponse.json({ message: "Identificador inválido" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("menu_items")
    .delete()
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    console.error("Failed to delete menu item", error);
    return NextResponse.json({ message: "No se pudo eliminar el platillo" }, { status: 500 });
  }

  return NextResponse.json({ message: "Platillo eliminado" }, { status: 200 });
}
