/**
 * Eager imports register server function modules at startup. TanStack Start lazy-loads
 * handlers in production, but importing here avoids dev "Invalid server function ID"
 * races when the client calls a fn before Vite has compiled its provider module.
 */
import "@/features/auth/functions/complete-discord-auth";
import "@/features/auth/functions/refresh-member-access";
import "@/features/auth/functions/refresh-member-session";
import "@/features/auth/functions/refresh-verification-from-discord";
import "@/features/member/functions/member-profile.functions";
import "@/features/member/functions/profile-comments.functions";
import "@/features/admin/features/teams/functions/delete-team.functions";
import "@/features/admin/features/members/functions/discord-sync.functions";
import "@/features/game-servers/functions/palworld-status.functions";
import "@/features/game-servers/functions/palworld-detail.functions";
import "@/features/game-servers/functions/palworld-join.functions";
import "@/features/game-servers/functions/palworld-players.functions";
