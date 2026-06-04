/**
 * Public tournament services — thin wrappers around the admin services.
 *
 * This keeps a single source of truth: the admin in-memory store (backed by
 * mockTournaments / Supabase later). The public side never maintains its own
 * duplicate data.
 */

export {
  fetchTournaments,
  fetchTournamentById,
} from "@/features/admin/features/tournaments/services/tournaments.service";

export { fetchTournamentRegistrations } from "@/features/admin/features/tournaments/services/tournament-registrations.service";
