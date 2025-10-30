const restaurantIdEnv =
  process.env["NEXT_PUBLIC_DEFAULT_RESTAURANT_ID"] ?? process.env["NEXT_PUBLIC_DEMO_RESTAURANT_ID"];

export function getKitchenRestaurantId() {
  if (!restaurantIdEnv) {
    throw new Error(
      "Missing NEXT_PUBLIC_DEFAULT_RESTAURANT_ID (o NEXT_PUBLIC_DEMO_RESTAURANT_ID) para el tablero de cocina.",
    );
  }
  return restaurantIdEnv;
}

export function getOwnerRestaurantId() {
  return getKitchenRestaurantId();
}
