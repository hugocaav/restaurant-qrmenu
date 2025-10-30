import { Buffer } from "node:buffer";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getOwnerRestaurantId } from "@/lib/kitchen-config";

const allowedRoles = new Set(["owner", "manager"]);
const BUCKET_NAME = "menu-images";
const MAX_FILES = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

async function getAuthorizedRestaurant() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("users_public")
    .select("role, restaurant_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return null;
  }

  if (!allowedRoles.has(profile.role)) {
    return null;
  }

  const expectedRestaurantId = getOwnerRestaurantId();
  if (!profile.restaurant_id || profile.restaurant_id !== expectedRestaurantId) {
    return null;
  }

  return profile.restaurant_id;
}

export async function POST(request: NextRequest) {
  const restaurantId = await getAuthorizedRestaurant();
  if (!restaurantId) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ message: "No se adjuntó ninguna imagen" }, { status: 400 });
  }

  if (files.length > MAX_FILES) {
    return NextResponse.json({ message: `Solo puedes subir hasta ${MAX_FILES} imágenes` }, { status: 400 });
  }

  const uploadedUrls: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ message: "Solo se permiten archivos de imagen" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: "Cada imagen debe pesar máximo 10 MB" }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const safeExtension = extension.replace(/[^a-z0-9]/gi, "");
    const path = `${restaurantId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExtension}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(path, Buffer.from(arrayBuffer), {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error", uploadError);
      return NextResponse.json({ message: "No se pudieron subir las imágenes" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(path);

    uploadedUrls.push(publicUrl);
  }

  return NextResponse.json({ urls: uploadedUrls }, { status: 200 });
}
