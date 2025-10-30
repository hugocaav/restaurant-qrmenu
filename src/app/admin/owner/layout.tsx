import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerRestaurantId } from "@/lib/kitchen-config";

const ALLOWED_ROLES = new Set(["owner", "manager"]);

export default async function OwnerProtectedLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const restaurantId = getOwnerRestaurantId();
  const { data: profile } = await supabase
    .from("users_public")
    .select("role, restaurant_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.restaurant_id !== restaurantId || !ALLOWED_ROLES.has(profile.role)) {
    redirect("/admin/login?error=unauthorized");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[hsl(var(--foreground))]">
      {children}
    </div>
  );
}
