/**
 * Eager imports so TanStack Start registers all server functions during dev
 * startup — avoids "Invalid server function ID" when the client calls a fn
 * before Vite has compiled its provider module.
 */
import "@/features/auth/functions/complete-discord-auth";
import "@/features/auth/functions/refresh-member-session";
import "@/features/member/functions/member-profile.functions";
import "@/features/member/functions/profile-comments.functions";
import "@/features/admin/features/teams/functions/delete-team.functions";
