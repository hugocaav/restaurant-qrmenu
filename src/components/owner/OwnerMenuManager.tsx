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

const MAX_IMAGES = 5;
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
    <section className="mx-auto w-full max-w-lg flex flex-col gap-4 px-2 pt-3 pb-20 text-[hsl(var(--foreground))]">
      <header className="flex flex-col gap-2 items-stretch mb-2">
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs uppercase tracking-[0.35em] text-[#00463D]">Panel del propietario</p>
          <h1 className="font-display text-2xl font-semibold mt-1">Administrar menú</h1>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="w-full bg-[#00463D] text-white rounded-full p-3 text-base font-semibold uppercase tracking-widest shadow-sm active:scale-95 mt-2 focus:outline-none transition">Volver al panel</button>
        )}
      </header>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white border border-[hsl(var(--border))] rounded-2xl p-4 shadow">
        <label className="flex flex-col gap-2 text-xs uppercase">
          Nombre del platillo
          <input type="text" value={form.name} required maxLength={120} className="rounded-lg border p-2 w-full text-base font-sans" onChange={e => setForm(prev => ({...prev, name: e.target.value}))} />
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase">
          Precio (MXN)
          <input type="text" inputMode="decimal" value={form.price} required className="rounded-lg border p-2 w-full text-base font-sans" onChange={e => setForm(prev => ({...prev, price: normalizePrice(e.target.value)}))} />
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase">
          Categoría
          <select value={form.category} onChange={e => setForm(prev => ({...prev, category: e.target.value as MenuCategory}))} className="rounded-lg border px-2 py-2 w-full text-base font-sans">
            {MENU_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.adminLabel}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase">
          Descripción
          <textarea required rows={3} value={form.description} className="rounded-lg border px-2 py-2 w-full font-sans" onChange={e => setForm(prev => ({...prev, description: e.target.value}))}></textarea>
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase">
          Alérgenos (opcional)
          <input type="text" value={form.allergens} placeholder="Gluten, Lácteos..." className="rounded-lg border px-2 py-2 w-full text-base font-sans" onChange={e => setForm(prev => ({...prev, allergens: e.target.value}))} />
        </label>
        {/* Imágenes (previews, subida, etc. siguen lógica pero con imágenes más grandes en mobile y grid de 2 col en sm+) */}
        {/* Feedback */}
        {feedback && <div className="rounded-lg bg-green-100 px-2 py-2 text-green-700 text-center text-sm font-semibold">{feedback}</div>}
        {error && <div className="rounded-lg bg-red-100 px-2 py-2 text-red-700 text-center text-sm font-semibold">{error}</div>}
        <div className="flex flex-col gap-2 mt-2">
          <button type="submit" disabled={submitting} className="w-full bg-[#00463D] text-white py-3 rounded-full font-bold uppercase text-base shadow hover:brightness-110 transition disabled:bg-opacity-60 font-sans">{submitting ? "Guardando…" : (form.id ? "Actualizar platillo" : "Guardar platillo")}</button>
          {form.id && <button type="button" onClick={resetForm} className="w-full border border-[#00463D] bg-white text-[#00463D] py-3 rounded-full font-bold uppercase text-base shadow hover:bg-[#f4faf9] transition font-sans">Cancelar edición</button>}
        </div>
      </form>
      <section className="flex flex-col gap-2 mt-6">
        <h2 className="font-display text-lg font-semibold text-[#00463D] text-center mb-3">Platillos publicados</h2>
        {loading ? <div className="bg-white rounded-lg text-center py-6 text-gray-400">Cargando platillos…</div> : items.length === 0 ? <div className="bg-white border border-dashed rounded-lg text-center py-8 text-gray-500">Aún no tienes platillos registrados</div> : (
          <ul className="flex flex-col gap-4">
            {items.map(item => (
              <li key={item.id} className="rounded-xl border border-gray-200 bg-white p-3 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-4 sm:flex-row flex-col">
                  {item.image_urls[0] && <div className="flex-none rounded-xl overflow-hidden bg-gray-100 w-24 h-24 relative">
                    <Image src={item.image_urls[0]} alt={item.name} fill className="object-cover" />
                  </div>}
                  <div className="flex-1 flex flex-col gap-1">
                    <span className="font-bold text-[#00463D] text-base">{item.name}</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{getCategoryMeta(mapDbCategory(item.category)).adminLabel}</span>
                    <span className="text-[15px] text-gray-800">{item.description}</span>
                    <span className="font-semibold text-[#00463D]">${item.price}</span>
                    {item.allergens.length > 0 && <span className="text-xs text-gray-400">Alérgenos: {item.allergens.join(', ')}</span>}
                  </div>
                </div>
                <div className="flex flex-col gap-2 mt-2 sm:flex-row sm:gap-4">
                  <button type="button" onClick={() => populateForm(item)} className="w-full bg-[#009291] text-white rounded-full py-2 font-semibold uppercase text-sm font-sans">Editar</button>
                  <button type="button" onClick={() => { setForm({...form, id: item.id}); handleDelete(); }} disabled={deleting} className="w-full bg-red-500 text-white rounded-full py-2 font-semibold uppercase text-sm font-sans disabled:bg-red-300">{deleting ? "Eliminando…" : "Eliminar"}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
