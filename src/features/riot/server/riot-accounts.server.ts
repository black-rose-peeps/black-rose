import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { RIOT_CONSENT_VERSION } from "../constants";
import type { RiotAccount } from "@/features/member/types";

export interface RiotAccountRow {
  id: string;
  member_id: string;
  puuid: string;
  game_name: string;
  tagline: string;
  region: string;
  rso_subject: string | null;
  is_public: boolean;
  consent_version: string;
  linked_at: string;
  created_at: string;
  updated_at: string;
}

function mapMissingTableError(error: { message: string }): never {
  if (error.message.includes("riot_accounts")) {
    throw new Error(
      "riot_accounts table is missing. Run docs/sql/riot_accounts.sql in Supabase.",
    );
  }
  throw new Error(error.message);
}

export function rowToRiotAccount(row: RiotAccountRow, includeVisibility = false): RiotAccount {
  const account: RiotAccount = {
    gameName: row.game_name,
    tagline: row.tagline,
    region: row.region,
    isLinked: true,
  };

  if (includeVisibility) {
    account.isPublic = row.is_public;
  }

  return account;
}

export async function loadRiotAccountRow(memberId: string): Promise<RiotAccountRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("riot_accounts")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle();

  if (error) mapMissingTableError(error);
  return (data as RiotAccountRow | null) ?? null;
}

export function riotAccountForViewer(
  row: RiotAccountRow | null,
  isOwner: boolean,
): RiotAccount | null {
  if (!row) return null;
  if (!isOwner && !row.is_public) return null;
  return rowToRiotAccount(row, isOwner);
}

export interface UpsertRiotAccountInput {
  memberId: string;
  puuid: string;
  gameName: string;
  tagline: string;
  region: string;
  rsoSubject: string | null;
  isPublic: boolean;
  consentVersion?: string;
}

export async function upsertRiotAccount(input: UpsertRiotAccountInput): Promise<RiotAccountRow> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const consentVersion = input.consentVersion ?? RIOT_CONSENT_VERSION;

  const { data: existingPuuid, error: puuidError } = await supabase
    .from("riot_accounts")
    .select("member_id")
    .eq("puuid", input.puuid)
    .maybeSingle();

  if (puuidError) mapMissingTableError(puuidError);
  if (existingPuuid && existingPuuid.member_id !== input.memberId) {
    throw new Error("This Riot account is already linked to another Black Rose member.");
  }

  const payload = {
    member_id: input.memberId,
    puuid: input.puuid,
    game_name: input.gameName,
    tagline: input.tagline,
    region: input.region.trim(),
    rso_subject: input.rsoSubject,
    is_public: input.isPublic,
    consent_version: consentVersion,
    linked_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("riot_accounts")
    .upsert(payload, { onConflict: "member_id" })
    .select()
    .single();

  if (error) mapMissingTableError(error);
  return data as RiotAccountRow;
}

export async function unlinkRiotAccount(memberId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("riot_accounts").delete().eq("member_id", memberId);
  if (error) mapMissingTableError(error);
}

export async function updateRiotAccountVisibility(
  memberId: string,
  isPublic: boolean,
): Promise<RiotAccountRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("riot_accounts")
    .update({
      is_public: isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq("member_id", memberId)
    .select()
    .single();

  if (error) mapMissingTableError(error);
  if (!data) throw new Error("Riot account not found.");
  return data as RiotAccountRow;
}
