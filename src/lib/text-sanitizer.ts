const EMOJI_REGEX = /\p{Extended_Pictographic}/u;
const CONTROL_REGEX = /[\u0000-\u001F\u007F]/u;

interface SanitizeOptions {
  maxLength: number;
  fieldLabel?: string;
  allowNewlines?: boolean;
  minLength?: number;
}

export function sanitizePlainText(value: string, options: SanitizeOptions): string {
  const { maxLength, fieldLabel = "El campo", allowNewlines = false, minLength = 0 } = options;

  if (typeof value !== "string") {
    throw new Error(`${fieldLabel} es inválido.`);
  }

  let normalized = value.normalize("NFKC");
  normalized = allowNewlines ? normalized.replace(/\r\n?/g, "\n") : normalized.replace(/\s+/g, " ");
  normalized = normalized.trim();

  if (minLength > 0 && normalized.length < minLength) {
    throw new Error(`${fieldLabel} es requerido.`);
  }

  if (normalized.length > maxLength) {
    throw new Error(`${fieldLabel} debe tener máximo ${maxLength} caracteres.`);
  }

  if (!allowNewlines && /\n/.test(normalized)) {
    throw new Error(`${fieldLabel} no admite saltos de línea.`);
  }

  if (EMOJI_REGEX.test(normalized)) {
    throw new Error(`${fieldLabel} no admite emojis.`);
  }

  if (CONTROL_REGEX.test(normalized)) {
    throw new Error(`${fieldLabel} contiene caracteres inválidos.`);
  }

  return normalized;
}

export function sanitizeMultiline(value: string, options: SanitizeOptions): string {
  const sanitized = sanitizePlainText(value, { ...options, allowNewlines: true });
  return sanitized
    .split("\n")
    .map((line) => line.replace(/[\t]+/g, " ").trim())
    .join("\n")
    .trim();
}

export function sanitizeOptional(value: string | null | undefined, options: SanitizeOptions): string {
  if (!value) {
    return "";
  }
  if (options.allowNewlines) {
    return sanitizeMultiline(value, options);
  }
  return sanitizePlainText(value, options);
}
