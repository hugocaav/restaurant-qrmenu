import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LanguageSelector } from "@/components/menu/LanguageSelector";

export default async function LanguageSelectPage({
  params,
}: {
  params: Promise<{ restaurantId: string; tableId: string }>;
}) {
  const { restaurantId, tableId } = await params;
  const supabase = await createSupabaseServerClient();

  const [restaurantResult, tableResult] = await Promise.all([
    supabase
      .from("restaurants")
      .select("id, name")
      .eq("id", restaurantId)
      .single(),
    supabase
      .from("tables")
      .select("id, is_active")
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .single(),
  ]);

  if (restaurantResult.error || !restaurantResult.data) {
    notFound();
  }

  if (tableResult.error || !tableResult.data || !tableResult.data.is_active) {
    notFound();
  }

  return (
    <LanguageSelector
      restaurantId={restaurantId}
      tableId={tableId}
      restaurantName={restaurantResult.data.name}
    />
  );
}

