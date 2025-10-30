import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { KitchenHeader } from "@/components/kitchen/KitchenHeader";
import { getKitchenRestaurantId } from "@/lib/kitchen-config";

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const restaurantId = getKitchenRestaurantId();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("users_public")
    .select("full_name, role, restaurant_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "kitchen" || profile.restaurant_id !== restaurantId) {
    redirect("/admin/login?error=unauthorized");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[hsl(var(--foreground))]">
      <KitchenHeader fullName={profile.full_name} />
      {children}
    </div>
  );
}
