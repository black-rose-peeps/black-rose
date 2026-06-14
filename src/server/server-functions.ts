/**
 * Eager imports register server function modules at startup. TanStack Start lazy-loads
 * handlers in production, but importing here avoids dev "Invalid server function ID"
 * races when the client calls a fn before Vite has compiled its provider module.
 */
import "@/features/auth/functions/complete-discord-auth";
import "@/features/auth/functions/refresh-member-session";
import "@/features/member/functions/member-profile.functions";
import "@/features/member/functions/profile-comments.functions";
import "@/features/admin/features/teams/functions/delete-team.functions";
