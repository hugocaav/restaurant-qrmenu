import { KitchenOrdersBoard } from "@/components/kitchen/KitchenOrdersBoard";
import { getKitchenRestaurantId } from "@/lib/kitchen-config";

export default function KitchenPage() {
  const restaurantId = getKitchenRestaurantId();
  return (
    <main className="min-h-screen bg-white text-[hsl(var(--foreground))]">
      <KitchenOrdersBoard restaurantId={restaurantId} />
    </main>
  );
}
