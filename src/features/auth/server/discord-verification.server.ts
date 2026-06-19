import type { MemberVerificationStatus } from "@/features/admin/features/members/types";
import { getConfiguredRoseRoleId } from "./discord-config.server";

export function rolesIncludeRose(roleIds: readonly string[], roseRoleId: string): boolean {
  return roleIds.includes(roseRoleId);
}

/**
 * Update site verification when a Discord user's ROSE role changes.
 * No-op when the member row does not exist yet (user has not signed in on the site).
 */
export async function applyVerificationByDiscordId(
  discordUserId: string,
  hasRoseRole: boolean,
  roseRoleId?: string,
): Promise<{ updated: boolean; memberId?: string; status?: MemberVerificationStatus }> {
  const targetStatus: MemberVerificationStatus = hasRoseRole ? "Verified" : "Not Verified";
  const { getSupabaseAdmin } = await import("@/lib/supabase-admin");

  const supabase = getSupabaseAdmin();
  const { data: existing, error: findError } = await supabase
    .from("members")
    .select("id, status")
    .eq("discord_id", discordUserId)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }

  if (!existing) {
    return { updated: false };
  }

  if (existing.status === targetStatus) {
    return { updated: false, memberId: existing.id, status: targetStatus };
  }

  const { error: updateError } = await supabase
    .from("members")
    .update({ status: targetStatus })
    .eq("id", existing.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { invalidateMemberAuthCache } = await import("./member-auth.server");
  invalidateMemberAuthCache(existing.id);

  const roleHint = roseRoleId ?? getConfiguredRoseRoleId() ?? "ROSE";
  console.info(
    `[discord] ${discordUserId} verification -> ${targetStatus} (role ${roleHint})`,
  );

  return { updated: true, memberId: existing.id, status: targetStatus };
}

export async function applyVerificationFromRoleIds(
  discordUserId: string,
  roleIds: readonly string[],
  roseRoleId: string,
): Promise<{ updated: boolean; memberId?: string; status?: MemberVerificationStatus }> {
  return applyVerificationByDiscordId(
    discordUserId,
    rolesIncludeRose(roleIds, roseRoleId),
    roseRoleId,
  );
}
