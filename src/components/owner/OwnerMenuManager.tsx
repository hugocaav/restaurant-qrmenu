"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { MENU_CATEGORIES, CATEGORY_ORDER, CATEGORY_ALIAS_MAP, getCategoryMeta } from "@/data/menu-categories";
import type { MenuCategory } from "@/store/cart-store";

interface MenuItemRecord {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_urls: string[];
  allergens: string[];
  is_available: boolean;
  created_at: string;
}

interface FormState {
  id?: string;
  name: string;
  description: string;
  price: string;
  category: MenuCategory;
  existingImages: string[];
  newFiles: File[];
  allergens: string;
}

const DEFAULT_CATEGORY: MenuCategory = CATEGORY_ORDER[0] ?? "mixology";

const INITIAL_FORM: FormState = {
  name: "",
  description: "",
  price: "",
  category: DEFAULT_CATEGORY,
  existingImages: [],
  newFiles: [],
  allergens: "",
};

function normalizePrice(value: string): string {
  return value.replace(/[^0-9.,]/g, "").replace(/,/g, ".");
}

function mapDbCategory(value: string): MenuCategory {
  if (CATEGORY_ORDER.includes(value as MenuCategory)) {
    return value as MenuCategory;
  }
  return CATEGORY_ALIAS_MAP[value] ?? DEFAULT_CATEGORY;
}

function formatCurrency(value: number): string {
  return value.toLocaleString("es-MX", { style: "currency", currency: "MXN" });
}

const MAX_IMAGES = 6;
const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

interface OwnerMenuManagerProps {
  onClose?: () => void;
}

export function OwnerMenuManager({ onClose }: OwnerMenuManagerProps) {
  const router = useRouter();
  const [items, setItems] = useState<MenuItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/menu-items", { cache: "no-store" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message ?? "No se pudieron obtener los platillos");
      }
      const payload = (await response.json()) as { items: MenuItemRecord[] };
      setItems(payload.items ?? []);

      if (form.id && !(payload.items ?? []).some((item) => item.id === form.id)) {
        setForm(INITIAL_FORM);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudieron obtener los platillos");
    } finally {
      setLoading(false);
    }
  }, [form.id]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const previewCategory = useMemo(() => getCategoryMeta(form.category), [form.category]);
  const totalImagesSelected = form.existingImages.length + form.newFiles.length;

  const handleExistingImageRemove = (index: number) => {
    setForm((prev) => ({
      ...prev,
      existingImages: prev.existingImages.filter((_, idx) => idx !== index),
    }));
  };

  const handleNewFileRemove = (index: number) => {
    setForm((prev) => ({
      ...prev,
      newFiles: prev.newFiles.filter((_, idx) => idx !== index),
    }));
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setForm((prev) => {
      const remainingSlots = MAX_IMAGES - (prev.existingImages.length + prev.newFiles.length);
      const allowFiles = files.slice(0, remainingSlots);

      const invalid = allowFiles.find((file) => !file.type.startsWith("image/"));
      if (invalid) {
        setError("Selecciona únicamente archivos de imagen");
        event.target.value = "";
        return prev;
      }

      const tooLarge = allowFiles.find((file) => file.size > IMAGE_MAX_SIZE);
      if (tooLarge) {
        setError("Cada imagen debe pesar máximo 10 MB");
        event.target.value = "";
        return prev;
      }

      if (allowFiles.length === 0) {
        setError(`Solo puedes subir hasta ${MAX_IMAGES} imágenes por platillo.`);
        event.target.value = "";
        return prev;
      }

      setError(null);
      event.target.value = "";
      return {
        ...prev,
        newFiles: [...prev.newFiles, ...allowFiles],
      };
    });
  };

  const populateForm = (item: MenuItemRecord) => {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: mapDbCategory(item.category),
      existingImages: item.image_urls ?? [],
      newFiles: [],
      allergens: item.allergens.join(", "),
    });
    setFeedback(null);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setFeedback(null);
    setError(null);
  };

  const uploadNewFiles = useCallback(async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];

    const data = new FormData();
    files.forEach((file) => data.append("files", file, file.name));

    const response = await fetch("/api/admin/menu-items/upload", {
      method: "POST",
      body: data,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.message ?? "No se pudieron cargar las imágenes");
    }

    const payload = (await response.json()) as { urls: string[] };
    return payload.urls ?? [];
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    setError(null);

    try {
      const priceValue = normalizePrice(form.price);
      const priceNumber = Number(priceValue);
      if (Number.isNaN(priceNumber)) {
        throw new Error("Ingresa un precio válido");
      }

      if (totalImagesSelected === 0) {
        throw new Error("Agrega al menos una imagen del platillo");
      }

      if (totalImagesSelected > MAX_IMAGES) {
        throw new Error(`Solo puedes subir hasta ${MAX_IMAGES} imágenes por platillo.`);
      }

      const allergenTokens = form.allergens
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      if (allergenTokens.length > 10) {
        throw new Error("Solo puedes registrar hasta 10 alérgenos.");
      }

      const uploadedUrls = await uploadNewFiles(form.newFiles);
      const finalImages = [...form.existingImages, ...uploadedUrls];

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: priceNumber,
        category: form.category,
        imageUrls: finalImages,
        allergens: allergenTokens,
      };

      const endpoint = form.id ? `/api/admin/menu-items/${form.id}` : "/api/admin/menu-items";
      const method = form.id ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.message ?? "No se pudo guardar el platillo");
      }

      setFeedback(form.id ? "Platillo actualizado correctamente" : "Platillo agregado correctamente");
      resetForm();
      await loadItems();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo guardar el platillo");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!form.id) {
      setError("Selecciona un platillo para eliminarlo");
      return;
    }

    if (!window.confirm("¿Eliminar este platillo? Esta acción no se puede deshacer.")) {
      return;
    }

    setDeleting(true);
    setError(null);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/menu-items/${form.id}`, { method: "DELETE" });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.message ?? "No se pudo eliminar el platillo");
      }

      setFeedback("Platillo eliminado correctamente");
      resetForm();
      await loadItems();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo eliminar el platillo");
    } finally {
      setDeleting(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/admin/login");
    } catch (err) {
      console.error(err);
      setError("No se pudo cerrar la sesión. Intenta nuevamente.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-10 text-[hsl(var(--foreground))] sm:px-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[#00463D]">Panel del propietario</p>
          <h1 className="font-display text-3xl font-semibold">Administrar menú</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Sube fotos tomadas con tu celular y edita la información de tus platillos en un solo lugar.
          </p>
        </div>
        <div className="flex gap-2">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[hsl(var(--foreground))] transition hover:border-[#00463D] hover:text-[#00463D]"
            >
              Volver al panel
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="rounded-full border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[hsl(var(--foreground))] transition hover:border-[#00463D] hover:text-[#00463D] disabled:cursor-not-allowed disabled:text-[hsl(var(--muted-foreground))]"
          >
            {signingOut ? "Cerrando…" : "Cerrar sesión"}
          </button>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-5 rounded-3xl border border-[hsl(var(--border))] bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
            Nombre del platillo
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
              maxLength={120}
              className="rounded-2xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-base text-[hsl(var(--foreground))] outline-none transition focus:border-[#00463D]"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
            Precio (MXN)
            <input
              type="text"
              inputMode="decimal"
              value={form.price}
              onChange={(event) => setForm((prev) => ({ ...prev, price: normalizePrice(event.target.value) }))}
              required
              className="rounded-2xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-base text-[hsl(var(--foreground))] outline-none transition focus:border-[#00463D]"
            />
          </label>
        </div>

        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
          Categoría
          <select
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as MenuCategory }))}
            className="rounded-2xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-base text-[hsl(var(--foreground))] outline-none transition focus:border-[#00463D]"
          >
            {MENU_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.adminLabel}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
          Descripción
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            required
            rows={4}
            className="rounded-2xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-base text-[hsl(var(--foreground))] outline-none transition focus:border-[#00463D]"
          />
        </label>

        <div className="grid gap-3">
          <span className="text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">Imágenes del platillo</span>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Sube fotos desde tu dispositivo. Recuerda seleccionar la imagen directamente, no compartir un enlace.
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Consejo: abre la imagen en tu galería, selecciona &quot;Compartir&quot; → &quot;Guardar en archivos&quot; (o similar) y súbela desde aquí.
          </p>

          {form.existingImages.length ? (
            <div className="grid gap-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Imágenes actuales</p>
              <div className="flex flex-wrap gap-3">
                {form.existingImages.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative h-24 w-24 overflow-hidden rounded-2xl border border-[hsl(var(--border))]">
                    <Image src={url} alt="Imagen actual" fill className="object-cover" sizes="96px" />
                    <button
                      type="button"
                      onClick={() => handleExistingImageRemove(index)}
                      className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {form.newFiles.length ? (
            <div className="grid gap-2">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">Imágenes nuevas</p>
              <div className="flex flex-wrap gap-3">
                {form.newFiles.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-white/70 px-3 py-2 text-xs text-[hsl(var(--foreground))]">
                    <span className="max-w-[8rem] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleNewFileRemove(index)}
                      className="rounded-full border border-[hsl(var(--border))] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] transition hover:border-red-400 hover:text-red-500"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {totalImagesSelected < MAX_IMAGES ? (
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-white px-4 py-3 text-sm text-[hsl(var(--muted-foreground))]"
            />
          ) : null}
          <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
            Puedes subir hasta {MAX_IMAGES} imágenes por platillo. Archivos máximo 10 MB.
          </p>
        </div>

        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
          Alérgenos (separados por comas, opcional)
          <input
            type="text"
            value={form.allergens}
            onChange={(event) => setForm((prev) => ({ ...prev, allergens: event.target.value }))}
            placeholder="Gluten, Lácteos, Mariscos"
            className="rounded-2xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-base text-[hsl(var(--foreground))] outline-none transition focus:border-[#00463D]"
          />
        </label>

        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))/25] p-4 text-sm text-[hsl(var(--muted-foreground))]">
          <p className="font-semibold text-[#00463D]">Resumen</p>
          <p className="mt-1 text-[hsl(var(--muted-foreground))]">{previewCategory.description}</p>
          <p className="mt-2 text-[hsl(var(--muted-foreground))]">
            {totalImagesSelected} imagen(es) se mostrarán en el menú.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-[hsl(var(--muted-foreground))]">
            {feedback ? <span className="text-[#00463D]">{feedback}</span> : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00463D] disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: "#00463D" }}
            >
              {submitting ? "Guardando…" : form.id ? "Actualizar platillo" : "Guardar platillo"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] px-5 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-[hsl(var(--foreground))] transition hover:border-[#00463D] hover:text-[#00463D]"
            >
              Cancelar
            </button>
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-400/40 bg-red-100 px-4 py-3 text-center text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </form>

      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold">Platillos publicados</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadItems()}
              className="rounded-full border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[hsl(var(--foreground))] transition hover:border-[#00463D] hover:text-[#00463D]"
            >
              Actualizar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={!form.id || deleting}
              className="rounded-full border border-red-400/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-red-600 transition hover:border-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? "Eliminando…" : "Eliminar platillo"}
            </button>
          </div>
        </header>

        {loading ? (
          <div className="rounded-3xl border border-[hsl(var(--border))] bg-white p-6 text-sm text-[hsl(var(--muted-foreground))]">
            Cargando platillos…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[hsl(var(--border))] bg-white p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Aún no tienes platillos registrados. Usa el formulario para agregar el primero.
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((item) => {
              const categoryId = mapDbCategory(item.category);
              const categoryMeta = getCategoryMeta(categoryId);

              return (
                <article
                  key={item.id}
                  className="flex flex-col gap-3 rounded-3xl border border-[hsl(var(--border))] bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-[#00463D]">{item.name}</h3>
                      <p className="text-xs uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
                        {categoryMeta.adminLabel}
                      </p>
                    </div>
                    <span className="text-lg font-semibold text-[#00463D]">{formatCurrency(item.price)}</span>
                  </div>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{item.description}</p>
                  {item.image_urls.length ? (
                    <div className="flex flex-wrap gap-2">
                      {item.image_urls.map((url) => (
                        <span
                          key={`${item.id}-${url}`}
                          className="rounded-full bg-[hsl(var(--muted))/25] px-3 py-1 text-xs text-[hsl(var(--muted-foreground))]"
                        >
                          {url}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {item.allergens.length ? (
                    <p className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                      Alérgenos: {item.allergens.join(", ")}
                    </p>
                  ) : null}
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
                    Creado el {new Date(item.created_at).toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => populateForm(item)}
                      className="rounded-full border border-[hsl(var(--border))] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[hsl(var(--foreground))] transition hover:border-[#00463D] hover:text-[#00463D]"
                    >
                      Editar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}
