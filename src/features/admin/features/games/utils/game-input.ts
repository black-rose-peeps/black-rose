import type { CreateGameInput, UpdateGameInput } from "../services/games.service";
import { normalizeProfileFieldConfig } from "@/features/game-membership/rules";

const TEXT_FIELDS = [
  "name",
  "slug",
  "display_name",
  "identity_group",
  "identity_field_label",
  "identity_field_placeholder",
  "identity_helper_text",
  "accent_class",
  "tournament_header_image",
  "icon",
] as const;
const NULLABLE = new Set<string>([
  "identity_group",
  "identity_field_label",
  "identity_field_placeholder",
  "identity_helper_text",
  "tournament_header_image",
  "icon",
]);

export function parseUpdateGameInput(value: unknown): UpdateGameInput {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid game input.");
  const input = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (![...TEXT_FIELDS, "is_active", "sort_order", "profile_field_config"].includes(key))
      throw new Error(`Unexpected game field: ${key}.`);
  }
  for (const key of TEXT_FIELDS) {
    if (input[key] === undefined) continue;
    if (input[key] === null && NULLABLE.has(key)) {
      result[key] = null;
      continue;
    }
    if (
      typeof input[key] !== "string" ||
      input[key].length > (key === "identity_helper_text" ? 1000 : 500)
    )
      throw new Error(`Invalid ${key}.`);
    const text = input[key].trim();
    if (!NULLABLE.has(key) && !text) throw new Error(`${key} is required.`);
    result[key] = NULLABLE.has(key) ? text || null : text;
  }
  if (result.slug !== undefined && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(result.slug)))
    throw new Error("Use a lowercase, hyphen-separated game slug.");
  if (input.is_active !== undefined) {
    if (typeof input.is_active !== "boolean") throw new Error("Invalid active flag.");
    result.is_active = input.is_active;
  }
  if (input.sort_order !== undefined) {
    if (!Number.isSafeInteger(input.sort_order) || Number(input.sort_order) < 0)
      throw new Error("Invalid sort order.");
    result.sort_order = input.sort_order;
  }
  if (input.profile_field_config !== undefined)
    result.profile_field_config = normalizeProfileFieldConfig(input.profile_field_config);
  if (!Object.keys(result).length) throw new Error("No game changes were supplied.");
  return result as UpdateGameInput;
}

export function parseCreateGameInput(value: unknown): CreateGameInput {
  const input = parseUpdateGameInput(value);
  if (!input.name || !input.slug || !input.display_name)
    throw new Error("Game name, slug and display name are required.");
  return { ...input, name: input.name, slug: input.slug, display_name: input.display_name };
}
