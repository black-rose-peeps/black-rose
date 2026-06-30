import { rulesFileDisplayName } from "@/features/tournaments/utils/rules-file-display";
import { supabase } from "@/lib/supabase";
import {
  TOURNAMENT_RULES_FILE_MAX_BYTES,
  TOURNAMENT_RULES_FILE_EXTENSIONS,
} from "../constants";

export { rulesFileDisplayName };

export const TOURNAMENT_RULES_BUCKET = "tournament-rules";

function fileExtension(name: string): string {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function validateTournamentRulesFile(file: File): string | null {
  const ext = fileExtension(file.name);
  if (
    !TOURNAMENT_RULES_FILE_EXTENSIONS.includes(
      ext as (typeof TOURNAMENT_RULES_FILE_EXTENSIONS)[number],
    )
  ) {
    return "Upload a PDF or Word document (.pdf, .doc, .docx).";
  }
  if (file.size > TOURNAMENT_RULES_FILE_MAX_BYTES) {
    return `File must be ${Math.round(TOURNAMENT_RULES_FILE_MAX_BYTES / (1024 * 1024))}MB or smaller.`;
  }
  return null;
}

export async function removeTournamentRulesFiles(tournamentId: string): Promise<void> {
  const { data, error } = await supabase.storage.from(TOURNAMENT_RULES_BUCKET).list(tournamentId);
  if (error) throw new Error(error.message);
  if (!data?.length) return;

  const paths = data.map((item) => `${tournamentId}/${item.name}`);
  const { error: removeError } = await supabase.storage
    .from(TOURNAMENT_RULES_BUCKET)
    .remove(paths);
  if (removeError) throw new Error(removeError.message);
}

export async function uploadTournamentRulesFile(
  tournamentId: string,
  file: File,
): Promise<string> {
  const validationError = validateTournamentRulesFile(file);
  if (validationError) throw new Error(validationError);

  const ext = fileExtension(file.name);
  const path = `${tournamentId}/official-rules.${ext}`;

  await removeTournamentRulesFiles(tournamentId);

  const { error } = await supabase.storage.from(TOURNAMENT_RULES_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(TOURNAMENT_RULES_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}
