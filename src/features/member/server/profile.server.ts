import type { AdminMember } from "@/features/admin/features/members/types";
import { rowToAdminMember } from "@/features/admin/features/members/utils";
import type { DiscordConnection } from "@/features/auth/server/discord-api.server";
import { buildDiscordAvatarUrl } from "@/features/auth/utils/discord";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { SOCIAL_PLATFORM_ORDER } from "../constants";
import type { SocialPlatform } from "../types";
import {
  buildMemberProfile,
  type MemberProfileRow,
  type MemberSocialLinkRow,
} from "../utils/build-member-profile";
import { loadRiotAccountRow } from "@/features/riot/server/riot-accounts.server";
import { sanitizeSocialLinksForViewer } from "../utils/social-links";
import { sanitizeHttpUrl } from "../utils/validate-social-url";
import type { MemberProfile } from "../types";

const DISCORD_CONNECTION_PLATFORMS: Record<string, SocialPlatform> = {
  twitch: "twitch",
  youtube: "youtube",
  twitter: "x",
  instagram: "instagram",
  facebook: "facebook",
  tiktok: "tiktok",
};

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 32);
  return slug || "member";
}

async function pickUniqueSlug(base: string, memberId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const slug = slugify(base);

  const { data, error } = await supabase
    .from("member_profiles")
    .select("member_id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.member_id === memberId) return slug;

  return `${slug}-${memberId.slice(0, 8)}`;
}

function connectionToUrl(type: string, name: string): string | null {
  const encoded = encodeURIComponent(name);
  switch (type) {
    case "twitch":
      return `https://www.twitch.tv/${encoded}`;
    case "youtube":
      return `https://www.youtube.com/@${encoded}`;
    case "twitter":
      return `https://x.com/${encoded}`;
    case "instagram":
      return `https://www.instagram.com/${encoded}`;
    case "tiktok":
      return `https://www.tiktok.com/@${encoded}`;
    case "facebook":
      return `https://www.facebook.com/${encoded}`;
    default:
      return null;
  }
}

async function ensureDefaultSocialLinks(memberId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const rows = SOCIAL_PLATFORM_ORDER.map((platform) => ({
    member_id: memberId,
    platform,
    url: null,
    is_public: true,
  }));

  const { error } = await supabase
    .from("member_social_links")
    .upsert(rows, { onConflict: "member_id,platform", ignoreDuplicates: true });

  if (error) throw new Error(error.message);
}

async function applyDiscordConnections(
  memberId: string,
  connections: DiscordConnection[],
  discordId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const discordProfileUrl = `https://discord.com/users/${discordId}`;
  const { error: discordLinkError } = await supabase
    .from("member_social_links")
    .update({ url: discordProfileUrl, is_public: true })
    .eq("member_id", memberId)
    .eq("platform", "discord")
    .is("url", null);

  if (discordLinkError) {
    throw new Error(
      `Failed to sync Discord profile link for member ${memberId}: ${discordLinkError.message}`,
    );
  }

  for (const connection of connections) {
    if (connection.visibility !== 1) continue;

    const platform = DISCORD_CONNECTION_PLATFORMS[connection.type];
    if (!platform) continue;

    const url = connectionToUrl(connection.type, connection.name);
    if (!url) continue;

    const { error: linkError } = await supabase
      .from("member_social_links")
      .update({ url, is_public: true })
      .eq("member_id", memberId)
      .eq("platform", platform)
      .is("url", null);

    if (linkError) {
      throw new Error(
        `Failed to sync ${platform} link for member ${memberId} (${connection.type}): ${linkError.message}`,
      );
    }
  }
}

export interface EnsureMemberProfileInput {
  member: AdminMember;
  displayName: string;
  discordUserId: string;
  discordAvatarHash: string | null;
  connections?: DiscordConnection[];
}

export async function ensureMemberProfile(input: EnsureMemberProfileInput): Promise<MemberProfileRow> {
  const supabase = getSupabaseAdmin();
  const avatarUrl = buildDiscordAvatarUrl(input.discordUserId, input.discordAvatarHash);

  const { data: existing, error: fetchError } = await supabase
    .from("member_profiles")
    .select("*")
    .eq("member_id", input.member.id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);

  if (existing) {
    const updates: Record<string, string | null> = {
      display_name: input.displayName.trim() || input.member.username,
      updated_at: new Date().toISOString(),
    };

    updates.avatar_url = avatarUrl;

    const { data, error } = await supabase
      .from("member_profiles")
      .update(updates)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await ensureDefaultSocialLinks(input.member.id);
    if (input.connections?.length) {
      await applyDiscordConnections(input.member.id, input.connections, input.discordUserId);
    } else {
      await applyDiscordConnections(input.member.id, [], input.discordUserId);
    }

    return data as MemberProfileRow;
  }

  const slug = await pickUniqueSlug(input.member.username, input.member.id);
  const { data, error } = await supabase
    .from("member_profiles")
    .insert({
      member_id: input.member.id,
      slug,
      display_name: input.displayName.trim() || input.member.username,
      headline: "Black Rose Member",
      bio: "",
      main_role: "",
      region: "",
      avatar_url: avatarUrl,
      is_public: true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await ensureDefaultSocialLinks(input.member.id);
  await applyDiscordConnections(
    input.member.id,
    input.connections ?? [],
    input.discordUserId,
  );

  return data as MemberProfileRow;
}

async function loadProfileBundle(
  member: AdminMember,
): Promise<{ profile: MemberProfileRow; socials: MemberSocialLinkRow[] } | null> {
  const supabase = getSupabaseAdmin();

  const { data: profile, error: profileError } = await supabase
    .from("member_profiles")
    .select("*")
    .eq("member_id", member.id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile) return null;

  const { data: socials, error: socialError } = await supabase
    .from("member_social_links")
    .select("*")
    .eq("member_id", member.id);

  if (socialError) throw new Error(socialError.message);

  return {
    profile: profile as MemberProfileRow,
    socials: (socials ?? []) as MemberSocialLinkRow[],
  };
}

async function findMemberBySlug(slug: string): Promise<AdminMember | null> {
  const supabase = getSupabaseAdmin();

  const { data: profile, error } = await supabase
    .from("member_profiles")
    .select("member_id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile) return null;

  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("*")
    .eq("id", profile.member_id)
    .maybeSingle();

  if (memberError) throw new Error(memberError.message);
  return member ? rowToAdminMember(member) : null;
}

export async function fetchMemberProfileByMemberId(memberId: string): Promise<MemberProfile | null> {
  const supabase = getSupabaseAdmin();
  const { data: memberRow, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", memberId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!memberRow) return null;

  const member = rowToAdminMember(memberRow);
  let bundle = await loadProfileBundle(member);

  if (!bundle) {
    await ensureMemberProfile({
      member,
      displayName: member.username,
      discordUserId: member.discordId ?? member.id,
      discordAvatarHash: null,
    });
    bundle = await loadProfileBundle(member);
  }

  if (!bundle) return null;

  const riotRow = await loadRiotAccountRow(member.id);
  return buildMemberProfile(member, bundle.profile, bundle.socials, riotRow, true);
}

export async function fetchPublicMemberProfileBySlug(slug: string): Promise<MemberProfile | null> {
  return fetchMemberProfileBySlug(slug);
}

/** Load a profile by slug. Owners can view their own profile even when private. */
export async function fetchMemberProfileBySlug(
  slug: string,
  viewerMemberId?: string,
): Promise<MemberProfile | null> {
  const member = await findMemberBySlug(slug);
  if (!member) return null;

  const bundle = await loadProfileBundle(member);
  if (!bundle) return null;

  const isOwner = viewerMemberId === member.id;
  if (!bundle.profile.is_public && !isOwner) return null;

  const riotRow = await loadRiotAccountRow(member.id);
  const profile = buildMemberProfile(member, bundle.profile, bundle.socials, riotRow, isOwner);
  return {
    ...profile,
    socialLinks: sanitizeSocialLinksForViewer(profile.socialLinks, isOwner),
  };
}

export interface UpdateMemberProfileInput {
  memberId: string;
  displayName: string;
  headline: string;
  bio: string;
  mainGame: string | null;
  mainRole: string;
  region: string;
  isPublic: boolean;
  socialLinks: { platform: SocialPlatform; url: string | null; isPublic: boolean }[];
}

export async function updateMemberProfile(input: UpdateMemberProfileInput): Promise<MemberProfile> {
  const supabase = getSupabaseAdmin();

  const { data: memberRow, error: memberError } = await supabase
    .from("members")
    .select("*")
    .eq("id", input.memberId)
    .maybeSingle();

  if (memberError) throw new Error(memberError.message);
  if (!memberRow) throw new Error("Member not found.");

  const member = rowToAdminMember(memberRow);

  const { data: profile, error: profileError } = await supabase
    .from("member_profiles")
    .select("*")
    .eq("member_id", input.memberId)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  if (!profile) throw new Error("Profile not found. Sign in again to create your profile.");

  const { error: updateError } = await supabase
    .from("member_profiles")
    .update({
      display_name: input.displayName.trim() || member.username,
      headline: input.headline.trim() || "Black Rose Member",
      bio: input.bio.trim(),
      main_game: input.mainGame?.trim() || null,
      main_role: input.mainRole.trim(),
      region: input.region.trim(),
      is_public: input.isPublic,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) throw new Error(updateError.message);

  await ensureDefaultSocialLinks(input.memberId);

  for (const link of input.socialLinks) {
    const { data: updatedRows, error: updateLinkError } = await supabase
      .from("member_social_links")
      .update({
        url: sanitizeHttpUrl(link.url),
        is_public: link.isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq("member_id", input.memberId)
      .eq("platform", link.platform)
      .select("id");

    if (updateLinkError) throw new Error(updateLinkError.message);

    if (!updatedRows?.length) {
      const { error: insertError } = await supabase.from("member_social_links").insert({
        member_id: input.memberId,
        platform: link.platform,
        url: sanitizeHttpUrl(link.url),
        is_public: link.isPublic,
      });

      if (insertError) throw new Error(insertError.message);
    }
  }

  const updated = await fetchMemberProfileByMemberId(input.memberId);
  if (!updated) throw new Error("Failed to load updated profile.");
  return updated;
}
