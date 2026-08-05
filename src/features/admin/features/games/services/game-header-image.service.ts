import { supabase } from "@/lib/supabase";

export const GAME_HEADER_BUCKET = "game-headers";

export const GAME_HEADER_MAX_BYTES = 5 * 1024 * 1024; // 5MB
export const GAME_HEADER_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
export const GAME_HEADER_ACCEPT = ".jpg,.jpeg,.png,.webp";

function fileExtension(name: string): string {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function validateGameHeaderImage(file: File): string | null {
  const ext = fileExtension(file.name);
  if (
    !GAME_HEADER_EXTENSIONS.includes(
      ext as (typeof GAME_HEADER_EXTENSIONS)[number],
    )
  ) {
    return "Upload an image file (.jpg, .jpeg, .png, .webp).";
  }
  if (file.size > GAME_HEADER_MAX_BYTES) {
    return `File must be ${Math.round(GAME_HEADER_MAX_BYTES / (1024 * 1024))}MB or smaller.`;
  }
  return null;
}

async function removeGameHeaderPaths(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const { error: removeError } = await supabase.storage
    .from(GAME_HEADER_BUCKET)
    .remove(paths);
  if (removeError) throw new Error(removeError.message);
}

export async function removeGameHeaderImage(gameId: string): Promise<void> {
  const { data, error } = await supabase.storage.from(GAME_HEADER_BUCKET).list(gameId);
  if (error) throw new Error(error.message);
  if (!data?.length) return;

  const paths = data.map((item) => `${gameId}/${item.name}`);
  await removeGameHeaderPaths(paths);
}

async function removeStaleGameHeaderImages(
  gameId: string,
  keepPath: string,
): Promise<void> {
  const { data, error } = await supabase.storage.from(GAME_HEADER_BUCKET).list(gameId);
  if (error) throw new Error(error.message);
  if (!data?.length) return;

  const stalePaths = data
    .map((item) => `${gameId}/${item.name}`)
    .filter((path) => path !== keepPath);
  await removeGameHeaderPaths(stalePaths);
}

export async function uploadGameHeaderImage(
  gameId: string,
  file: File,
): Promise<string> {
  const validationError = validateGameHeaderImage(file);
  if (validationError) throw new Error(validationError);

  const ext = fileExtension(file.name);
  const path = `${gameId}/header.${ext}`;

  const { error } = await supabase.storage.from(GAME_HEADER_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);

  await removeStaleGameHeaderImages(gameId, path);

  const { data } = supabase.storage.from(GAME_HEADER_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
