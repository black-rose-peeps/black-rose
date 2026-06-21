import { getAdminConsoleUser } from "@/features/admin/auth/admin-session";
import { supabase } from "@/lib/supabase";

export const ADMIN_AUDIT_ACTIONS = {
  REGISTRATION_APPROVED: "registration.approved",
  REGISTRATION_REJECTED: "registration.rejected",
  MEMBER_VERIFIED: "member.verified",
  MEMBER_UNVERIFIED: "member.unverified",
  MEMBER_CREATED: "member.created",
  MEMBER_UPDATED: "member.updated",
  MEMBER_DELETED: "member.deleted",
  MEMBER_DISCORD_SYNC_RESET: "member.discord_sync_reset",
  TEAM_CREATED: "team.created",
  TEAM_UPDATED: "team.updated",
  TEAM_DELETED: "team.deleted",
  TEAM_MEMBER_ADDED: "team.member_added",
  TEAM_MEMBER_REMOVED: "team.member_removed",
  REGISTRATION_ADDED: "registration.added",
  REGISTRATION_REMOVED: "registration.removed",
  TOURNAMENT_CREATED: "tournament.created",
  TOURNAMENT_UPDATED: "tournament.updated",
  TOURNAMENT_PRIZE_UPDATED: "tournament.prize_updated",
  TOURNAMENT_STATUS_CHANGED: "tournament.status_changed",
  TOURNAMENT_DELETED: "tournament.deleted",
  BRACKET_PUBLISHED: "bracket.published",
  BRACKET_RESET: "bracket.reset",
  PROFILE_COMMENT_DELETED: "profile_comment.deleted",
  DISCORD_SYNC_TRIGGERED: "discord.sync_triggered",
} as const;

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[keyof typeof ADMIN_AUDIT_ACTIONS];

export interface AdminAuditLog {
  id: string;
  actorAdminUsername: string;
  action: AdminAuditAction | string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export const ADMIN_AUDIT_ACTION_LABELS: Record<string, string> = {
  [ADMIN_AUDIT_ACTIONS.REGISTRATION_APPROVED]: "Approved registration",
  [ADMIN_AUDIT_ACTIONS.REGISTRATION_REJECTED]: "Rejected registration",
  [ADMIN_AUDIT_ACTIONS.MEMBER_VERIFIED]: "Verified member",
  [ADMIN_AUDIT_ACTIONS.MEMBER_UNVERIFIED]: "Unverified member",
  [ADMIN_AUDIT_ACTIONS.MEMBER_CREATED]: "Created member",
  [ADMIN_AUDIT_ACTIONS.MEMBER_UPDATED]: "Updated member",
  [ADMIN_AUDIT_ACTIONS.MEMBER_DELETED]: "Deleted member",
  [ADMIN_AUDIT_ACTIONS.MEMBER_DISCORD_SYNC_RESET]: "Reset Discord sync queue",
  [ADMIN_AUDIT_ACTIONS.TEAM_CREATED]: "Created team",
  [ADMIN_AUDIT_ACTIONS.TEAM_UPDATED]: "Updated team",
  [ADMIN_AUDIT_ACTIONS.TEAM_DELETED]: "Deleted team",
  [ADMIN_AUDIT_ACTIONS.TEAM_MEMBER_ADDED]: "Added member to team",
  [ADMIN_AUDIT_ACTIONS.TEAM_MEMBER_REMOVED]: "Removed member from team",
  [ADMIN_AUDIT_ACTIONS.REGISTRATION_ADDED]: "Added to tournament",
  [ADMIN_AUDIT_ACTIONS.REGISTRATION_REMOVED]: "Removed from tournament",
  [ADMIN_AUDIT_ACTIONS.TOURNAMENT_CREATED]: "Created tournament",
  [ADMIN_AUDIT_ACTIONS.TOURNAMENT_UPDATED]: "Updated tournament",
  [ADMIN_AUDIT_ACTIONS.TOURNAMENT_PRIZE_UPDATED]: "Updated prize distribution",
  [ADMIN_AUDIT_ACTIONS.TOURNAMENT_STATUS_CHANGED]: "Changed tournament status",
  [ADMIN_AUDIT_ACTIONS.TOURNAMENT_DELETED]: "Deleted tournament",
  [ADMIN_AUDIT_ACTIONS.BRACKET_PUBLISHED]: "Published bracket",
  [ADMIN_AUDIT_ACTIONS.BRACKET_RESET]: "Reset bracket",
  [ADMIN_AUDIT_ACTIONS.PROFILE_COMMENT_DELETED]: "Deleted profile comment",
  [ADMIN_AUDIT_ACTIONS.DISCORD_SYNC_TRIGGERED]: "Triggered Discord sync",
};

interface LogAdminActionInput {
  action: AdminAuditAction | string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

function readMetadataString(
  meta: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

/** Parse jsonb rows that may arrive as a JSON string; normalize common key aliases. */
function normalizeAuditMetadata(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;

  let value: unknown = raw;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      value = JSON.parse(trimmed);
      if (typeof value === "string") {
        value = JSON.parse(value);
      }
    } catch {
      return null;
    }
  }

  if (typeof value !== "object" || Array.isArray(value)) return null;

  const record = { ...(value as Record<string, unknown>) };
  const tournamentName = readMetadataString(record, ["tournamentName", "tournament_name"]);
  if (tournamentName && !record.tournamentName) {
    record.tournamentName = tournamentName;
  }

  return record;
}

function auditLogHasTournamentName(log: AdminAuditLog): boolean {
  const meta = log.metadata;
  if (!meta) return false;
  return Boolean(readMetadataString(meta, ["tournamentName", "tournament_name", "name"]));
}

function rowToAuditLog(row: Record<string, unknown>): AdminAuditLog {
  return {
    id: row.id as string,
    actorAdminUsername: row.actor_admin_username as string,
    action: row.action as string,
    entityType: row.entity_type as string,
    entityId: (row.entity_id as string | null) ?? null,
    metadata: normalizeAuditMetadata(row.metadata_json),
    createdAt: row.created_at as string,
  };
}

/** Best-effort audit write — never throws; mutations must not fail if logging fails. */
export async function logAdminAction(input: LogAdminActionInput): Promise<void> {
  try {
    const actor = getAdminConsoleUser();
    if (!actor) return;

    const { error } = await supabase.rpc("insert_admin_audit_log", {
      p_actor_admin_username: actor,
      p_action: input.action,
      p_entity_type: input.entityType,
      p_entity_id: input.entityId ?? null,
      p_metadata: input.metadata ?? null,
    });

    if (error) {
      console.warn("[audit-log] insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[audit-log] insert failed:", err);
  }
}

async function hydrateTournamentNames(logs: AdminAuditLog[]): Promise<AdminAuditLog[]> {
  const tournamentIds = [
    ...new Set(
      logs
        .filter(
          (log) =>
            log.entityType === "tournament" && log.entityId && !auditLogHasTournamentName(log),
        )
        .map((log) => log.entityId as string),
    ),
  ];

  if (tournamentIds.length === 0) return logs;

  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("id, name")
    .in("id", tournamentIds);

  if (error) {
    console.warn("[audit-log] tournament name hydration failed:", error.message);
    return logs;
  }

  if (!tournaments?.length) return logs;

  const nameById = new Map(
    tournaments
      .filter((row) => typeof row.name === "string" && row.name.trim())
      .map((row) => [row.id as string, (row.name as string).trim()]),
  );

  return logs.map((log) => {
    if (log.entityType !== "tournament" || !log.entityId || auditLogHasTournamentName(log)) {
      return log;
    }

    const tournamentName = nameById.get(log.entityId);
    if (!tournamentName) return log;

    return {
      ...log,
      metadata: {
        ...(log.metadata ?? {}),
        tournamentName,
      },
    };
  });
}

export async function fetchAdminAuditLogs(limit = 500): Promise<AdminAuditLog[]> {
  const { data, error } = await supabase
    .from("admin_audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    if (error.message.includes("admin_audit_logs")) {
      throw new Error(
        "Audit log table is missing. Run docs/sql/admin_audit_logs.sql in Supabase.",
      );
    }
    throw new Error(error.message);
  }

  const logs = (data ?? []).map((row) => rowToAuditLog(row as Record<string, unknown>));
  return hydrateTournamentNames(logs);
}

export function formatAuditLogAction(action: string): string {
  return ADMIN_AUDIT_ACTION_LABELS[action] ?? action;
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  discord_sync: "Discord sync",
  registration: "Registration",
  member: "Member",
  team: "Team",
  tournament: "Tournament",
  profile_comment: "Profile comment",
};

export function formatAuditLogTarget(log: AdminAuditLog): string {
  const meta = log.metadata ?? {};

  const memberName = readMetadataString(meta, ["memberName", "member_name"]);
  const teamName = readMetadataString(meta, ["teamName", "team_name"]);
  const tournamentName = readMetadataString(meta, ["tournamentName", "tournament_name", "name"]);
  const username = readMetadataString(meta, ["username"]);

  if (memberName && teamName) {
    return `${memberName} · ${teamName}`;
  }

  if (log.entityType === "tournament" && tournamentName) {
    return tournamentName;
  }

  const name = teamName ?? memberName ?? tournamentName ?? username;

  if (name) {
    return name;
  }

  const entityLabel = ENTITY_TYPE_LABELS[log.entityType] ?? log.entityType;
  return entityLabel;
}

export function formatAuditLogDetails(log: AdminAuditLog): string {
  const meta = log.metadata;
  if (!meta || Object.keys(meta).length === 0) return "—";

  const parts: string[] = [];

  if (typeof meta.previousStatus === "string" && typeof meta.newStatus === "string") {
    parts.push(`${meta.previousStatus} → ${meta.newStatus}`);
  } else if (typeof meta.status === "string") {
    parts.push(String(meta.status));
  }

  if (Array.isArray(meta.changedFields) && meta.changedFields.length > 0) {
    parts.push(`Updated: ${meta.changedFields.join(", ")}`);
  }

  if (typeof meta.tierCount === "number") {
    parts.push(`${meta.tierCount} prize tier${meta.tierCount === 1 ? "" : "s"}`);
  }

  if (meta.stale === true) {
    parts.push("Stale signup");
  }

  if (typeof meta.bodyPreview === "string" && meta.bodyPreview.trim()) {
    parts.push(`"${meta.bodyPreview.trim()}"`);
  }

  if (
    typeof meta.tournamentName === "string" &&
    meta.tournamentName.trim() &&
    !parts.some((part) => part.includes(meta.tournamentName as string))
  ) {
    parts.push(meta.tournamentName);
  }

  if (typeof meta.tournamentName === "string" && typeof meta.teamName === "string") {
    parts.push(`${meta.teamName} @ ${meta.tournamentName}`);
  } else if (typeof meta.tournamentName === "string" && typeof meta.memberName === "string") {
    parts.push(`${meta.memberName} @ ${meta.tournamentName}`);
  }

  if (typeof meta.role === "string") {
    parts.push(meta.role);
  }

  if (typeof meta.game === "string") {
    parts.push(meta.game);
  }

  if (typeof meta.discordUsername === "string") {
    parts.push(meta.discordUsername);
  }

  if (typeof meta.checked === "number") {
    const verified = typeof meta.verified === "number" ? meta.verified : 0;
    const unverified = typeof meta.unverified === "number" ? meta.unverified : 0;
    parts.push(`Checked ${meta.checked} · ${verified} verified · ${unverified} unverified`);
  }

  if (typeof meta.previousName === "string" && typeof meta.teamName === "string") {
    if (meta.previousName !== meta.teamName) {
      parts.push(`Renamed from ${meta.previousName}`);
    }
  }

  if (parts.length > 0) {
    return parts.join(" · ");
  }

  return Object.entries(meta)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}
