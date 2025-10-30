import type { MenuCategory } from "@/store/cart-store";

export interface MenuCategoryMeta {
  id: MenuCategory;
  label: string;
  description: string;
  adminLabel: string;
}

export const MENU_CATEGORIES: MenuCategoryMeta[] = [
  {
    id: "nonAlcoholic",
    label: "Bebidas sin alcohol",
    adminLabel: "Bebidas sin alcohol",
    description: "Refrescos, mocktails y opciones refrescantes sin alcohol.",
  },
  {
    id: "mixology",
    label: "Mixología",
    adminLabel: "Mixología",
    description: "Cocteles clásicos y creaciones de autor para realzar tu experiencia.",
  },
  {
    id: "entradas",
    label: "Entradas",
    adminLabel: "Entradas",
    description: "Pequeños platillos para abrir el apetito o compartir.",
  },
  {
    id: "platosFuertes",
    label: "Platos fuertes",
    adminLabel: "Platos fuertes",
    description: "Selección de platos que protagonizan tu comida.",
  },
  {
    id: "postres",
    label: "Postres",
    adminLabel: "Postres",
    description: "Opciones dulces para cerrar con broche de oro.",
  },
];

export const CATEGORY_ORDER: MenuCategory[] = MENU_CATEGORIES.map((category) => category.id);

export const CATEGORY_ALIAS_MAP: Record<string, MenuCategory> = {
  non_alcoholic: "nonAlcoholic",
  mixology: "mixology",
  entradas: "entradas",
  platos_fuertes: "platosFuertes",
  postres: "postres",
  drinks: "mixology",
  food: "platosFuertes",
  desserts: "postres",
};

export const CATEGORY_DB_VALUE: Record<MenuCategory, string> = {
  nonAlcoholic: "non_alcoholic",
  mixology: "mixology",
  entradas: "entradas",
  platosFuertes: "platos_fuertes",
  postres: "postres",
};

export const LEGACY_NAME_CATEGORY_MAP: Record<string, MenuCategory> = {
  "espresso tonic": "mixology",
  "spritz de jamaica": "mixology",
  "limonada de pepino y hierbabuena": "nonAlcoholic",
  "té frío oolong cítrico": "nonAlcoholic",
  "guacamole ahumado": "entradas",
  "elote callejero trufado": "entradas",
  "taco crujiente de camarón": "platosFuertes",
  "tostada de atún": "platosFuertes",
  "cheesecake de maracuyá": "postres",
  "cremoso de chocolate 70%": "postres",
  "panqué tibio de elote": "postres",
  "fruta macerada a la menta": "postres",
};

export function getCategoryMeta(id: MenuCategory): MenuCategoryMeta {
  const meta = MENU_CATEGORIES.find((category) => category.id === id);
  if (!meta) {
    throw new Error(`Unknown menu category: ${id}`);
  }
  return meta;
}
