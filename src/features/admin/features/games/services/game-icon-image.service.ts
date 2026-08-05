import { supabase } from "@/lib/supabase";

export const GAME_ICON_BUCKET = "game-icons";

export const GAME_ICON_MAX_BYTES = 2 * 1024 * 1024; // 2MB
export const GAME_ICON_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
export const GAME_ICON_ACCEPT = ".jpg,.jpeg,.png,.webp";

function fileExtension(name: string): string {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function validateGameIconImage(file: File): string | null {
  const ext = fileExtension(file.name);
  if (
    !GAME_ICON_EXTENSIONS.includes(
      ext as (typeof GAME_ICON_EXTENSIONS)[number],
    )
  ) {
    return "Upload an image file (.jpg, .jpeg, .png, .webp).";
  }
  if (file.size > GAME_ICON_MAX_BYTES) {
    return `File must be ${Math.round(GAME_ICON_MAX_BYTES / (1024 * 1024))}MB or smaller.`;
  }
  return null;
}

async function removeGameIconPaths(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error: removeError } = await supabase.storage
    .from(GAME_ICON_BUCKET)
    .remove(paths);
  if (removeError) throw new Error(removeError.message);
}

export async function removeGameIconImage(gameId: string): Promise<void> {
  const { data, error } = await supabase.storage.from(GAME_ICON_BUCKET).list(gameId);
  if (error) throw new Error(error.message);
  if (!data?.length) return;

  const paths = data.map((item) => `${gameId}/${item.name}`);
  await removeGameIconPaths(paths);
}

async function removeStaleGameIconImages(
  gameId: string,
  keepPath: string,
): Promise<void> {
  const { data, error } = await supabase.storage.from(GAME_ICON_BUCKET).list(gameId);
  if (error) throw new Error(error.message);
  if (!data?.length) return;

  const stalePaths = data
    .map((item) => `${gameId}/${item.name}`)
    .filter((path) => path !== keepPath);
  await removeGameIconPaths(stalePaths);
}

export async function uploadGameIconImage(
  gameId: string,
  file: File,
): Promise<string> {
  const validationError = validateGameIconImage(file);
  if (validationError) throw new Error(validationError);

  const ext = fileExtension(file.name);
  const path = `${gameId}/icon.${ext}`;

  const { error } = await supabase.storage.from(GAME_ICON_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) {
    if (error.message.includes('Bucket not found')) {
      throw new Error(`Storage bucket '${GAME_ICON_BUCKET}' not found. Please create it in Supabase Dashboard > Storage > Buckets.`);
    }
    throw new Error(error.message);
  }

  await removeStaleGameIconImages(gameId, path);

  const { data } = supabase.storage.from(GAME_ICON_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
