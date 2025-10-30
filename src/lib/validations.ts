import { z } from "zod";
import { sanitizePlainText, sanitizeOptional } from "@/lib/text-sanitizer";

const plainTextField = (fieldLabel: string, maxLength: number, minLength = 0) =>
  z.string().transform((value) =>
    sanitizePlainText(value, {
      fieldLabel,
      maxLength,
      minLength,
    }),
  );

const optionalField = (fieldLabel: string, maxLength: number, allowNewlines = false) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) =>
      sanitizeOptional(value ?? "", {
        fieldLabel,
        maxLength,
        allowNewlines,
      }),
    )
    .transform((value) => (value.length ? value : null));

export const sessionRequestSchema = z.object({
  restaurantId: z.string().uuid({ message: "Invalid restaurant" }),
  tableId: z.string().uuid({ message: "Invalid table" }),
  persistent: z.boolean().optional(),
});

export const orderItemSchema = z.object({
  menuItemId: z.string().uuid({ message: "Invalid menu item" }),
  name: plainTextField("Nombre del platillo", 120, 1),
  price: z.number().nonnegative(),
  quantity: z.number().int().min(1).max(99),
});

export const orderStatusSchema = z.enum(["pending", "preparing", "ready", "delivered"]);

export const orderRequestSchema = z.object({
  restaurantId: z.string().uuid(),
  tableId: z.string().uuid(),
  sessionToken: z.string().min(1),
  items: z.array(orderItemSchema).min(1).max(99),
  allergyNotes: optionalField("Notas de alergia", 500),
  notes: optionalField("Notas", 500, true),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

export const orderUpdateSchema = z.object({
  restaurantId: z.string().uuid(),
  orderId: z.string().uuid(),
  nextStatus: orderStatusSchema,
});

export type SessionRequest = z.infer<typeof sessionRequestSchema>;
export type OrderRequest = z.infer<typeof orderRequestSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type OrderUpdateRequest = z.infer<typeof orderUpdateSchema>;
