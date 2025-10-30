import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerRestaurantId } from "@/lib/kitchen-config";
import { CATEGORY_DB_VALUE } from "@/data/menu-categories";
import type { MenuCategory } from "@/store/cart-store";
import type { Database } from "@/types/database";

const allowedRoles = new Set(["owner", "manager"]);

const imageUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) =>
      value.length === 0 ||
      value.startsWith("/") ||
      value.startsWith("http://") ||
      value.startsWith("https://"),
    { message: "Ingresa una URL válida o una ruta relativa" },
  );

const CATEGORY_SCHEMA = z.enum([
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
  category: CATEGORY_SCHEMA,
  imageUrls: z
    .array(imageUrlSchema)
    .max(6)
    .transform((values) => values.map((value) => value.trim()).filter((value) => value.length > 0)),
  allergens: z
    .array(z.string().trim().min(1).max(60))
    .max(10)
    .optional()
    .transform((values) => values ?? []),
});

type OwnerProfile = {
  role: string;
  restaurant_id: string;
};

async function getAuthorizedProfile(): Promise<{
  user: { id: string } | null;
  profile: OwnerProfile | null;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from("users_public")
    .select("role, restaurant_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { user, profile: null };
  }

  if (!allowedRoles.has(profile.role)) {
    return { user, profile: null };
  }

  const expectedRestaurantId = getOwnerRestaurantId();
  if (!profile.restaurant_id || profile.restaurant_id !== expectedRestaurantId) {
    return { user, profile: null };
  }

  return { user: { id: user.id }, profile: { role: profile.role, restaurant_id: profile.restaurant_id } };
}

export async function GET() {
  const { user, profile } = await getAuthorizedProfile();
  if (!user || !profile) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("menu_items")
    .select("id, name, description, price, category, image_urls, allergens, is_available, created_at")
    .eq("restaurant_id", profile.restaurant_id)
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch menu items", error);
    return NextResponse.json({ message: "No se pudieron obtener los platillos" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] }, { status: 200 });
}

export async function POST(request: Request) {
  const { user, profile } = await getAuthorizedProfile();
  if (!user || !profile) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const json = await request.json();
    const parsed = payloadSchema.parse(json);

    const dbCategory = CATEGORY_DB_VALUE[parsed.category];
    if (!dbCategory) {
      return NextResponse.json({ message: "Categoría inválida" }, { status: 400 });
    }

    const insertPayload: Database["public"]["Tables"]["menu_items"]["Insert"] = {
      restaurant_id: profile.restaurant_id,
      name: parsed.name,
      description: parsed.description,
      price: parsed.price,
      category: dbCategory as Database["public"]["Tables"]["menu_items"]["Insert"]["category"],
      image_urls: parsed.imageUrls,
      allergens: parsed.allergens,
    };

    const { data, error } = await supabaseAdmin
      .from("menu_items")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error || !data) {
      console.error("Failed to insert menu item", error);
      const status = error?.code === "23505" ? 409 : 500;
      return NextResponse.json({ message: "No se pudo registrar el platillo" }, { status });
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Datos inválidos", issues: error.flatten() }, { status: 400 });
    }

    console.error("Unexpected error creating menu item", error);
    return NextResponse.json({ message: "No se pudo registrar el platillo" }, { status: 500 });
  }
}
