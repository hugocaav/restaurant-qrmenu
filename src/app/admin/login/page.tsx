import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminLoginPanel } from "@/components/admin/AdminLoginPanel";
import { getKitchenRestaurantId } from "@/lib/kitchen-config";

export default async function KitchenLoginPage() {
  const restaurantId = getKitchenRestaurantId();
  const supabase = await createSupabaseServerClient();
  const [
    {
      data: { user },
    },
    restaurantQuery,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("restaurants").select("name").eq("id", restaurantId).single(),
  ]);

  if (user) {
    const { data: profile } = await supabase
      .from("users_public")
      .select("role, restaurant_id")
      .eq("id", user.id)
      .single();

    if (profile && profile.restaurant_id === restaurantId) {
      if (profile.role === "kitchen") {
        redirect("/admin/kitchen");
      }
      if (profile.role === "owner" || profile.role === "manager") {
        redirect("/admin/owner");
      }
    }
  }

  const restaurantName = restaurantQuery.data?.name;

  return <AdminLoginPanel restaurantId={restaurantId} restaurantName={restaurantName ?? "Heca"} />;
}
