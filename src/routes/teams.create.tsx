import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { MemberNav } from "@/features/member/components/MemberNav";
import { FormField } from "@/features/shared/components/FormField";
import { getSession } from "@/features/auth/store/session";
import { fetchTeamForUser } from "@/features/admin/features/teams/services/teams.service";
import { GAME_OPTIONS, ROLE_OPTIONS, MAX_TEAM_SIZE } from "@/features/teams/constants";

export const Route = createFileRoute("/teams/create")({
  head: () => ({ meta: [{ title: "Create Team — Black Rose" }] }),
  component: CreateTeamPage,
});

function CreateTeamPage() {
  const navigate = useNavigate();
  const session = getSession();

  useEffect(() => {
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    if (session.role === "not_verified") {
      navigate({ to: "/waitlist" });
      return;
    }
    let cancelled = false;
    fetchTeamForUser(session.id)
      .then((team) => {
        if (!cancelled && team) navigate({ to: "/teams" });
      })
      .catch((err) => {
        if (!cancelled) console.error("[teams/create] fetchTeamForUser failed:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate, session]);

  const [form, setForm] = useState({
    name: "",
    tag: "",
    game: "Valorant" as (typeof GAME_OPTIONS)[number]["value"],
    role: "IGL" as (typeof ROLE_OPTIONS)[number],
  });
  const [submitted, setSubmitted] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: POST /api/teams — create team in backend
    // For now simulate success and redirect to teams overview
    setSubmitted(true);
    setTimeout(() => navigate({ to: "/teams" }), 1500);
  }

  if (!session || session.role === "not_verified") return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MemberNav />
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-25" />

      <div className="relative mx-auto max-w-xl px-6 pt-24 pb-16">
        {/* Back */}
        <Link
          to="/teams"
          className="mb-8 inline-flex items-center gap-2 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Teams
        </Link>

        <div className="mb-8">
          <p className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
            Team Setup
          </p>
          <h1 className="mt-1 font-display text-4xl tracking-display">Create a Team</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You will be set as captain. You can invite members after creating the team.
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 border border-emerald-400/20 bg-emerald-400/5 px-6 py-10 text-center">
            <div className="font-display text-2xl tracking-display text-emerald-400">
              Team Created
            </div>
            <p className="text-sm text-muted-foreground">Redirecting to your team…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Team Name */}
            <FormField label="Team Name *">
              <input
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Novellino eSports"
                maxLength={40}
                className="h-11 w-full border border-border bg-secondary px-4 text-sm outline-none transition focus:border-foreground"
              />
            </FormField>

            {/* Team Tag */}
            <FormField label="Team Tag *" hint="3–5 uppercase letters, shown on brackets">
              <input
                required
                value={form.tag}
                onChange={(e) => update("tag", e.target.value.toUpperCase().slice(0, 5))}
                placeholder="NE"
                maxLength={5}
                pattern="[A-Z]{3,5}"
                className="h-11 w-full border border-border bg-secondary px-4 font-tech text-sm uppercase tracking-wider-2 outline-none transition focus:border-foreground"
              />
            </FormField>

            {/* Game */}
            <FormField label="Primary Game *">
              <select
                value={form.game}
                onChange={(e) => update("game", e.target.value as typeof form.game)}
                className="h-11 w-full border border-border bg-secondary px-4 text-sm outline-none transition focus:border-foreground"
              >
                {GAME_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Your role */}
            <FormField label="Your In-Game Role *">
              <select
                value={form.role}
                onChange={(e) => update("role", e.target.value as typeof form.role)}
                className="h-11 w-full border border-border bg-secondary px-4 text-sm outline-none transition focus:border-foreground"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </FormField>

            {/* Info callout */}
            <div className="flex items-start gap-3 border border-white/8 bg-white/2 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Teams need at least <strong className="text-foreground">5 active members</strong> to
                register for most tournaments. You can invite members from the team page after
                creation. Max roster size is {MAX_TEAM_SIZE}.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="clip-cta inline-flex h-11 items-center bg-foreground px-8 font-tech text-xs uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
              >
                Create Team
              </button>
              <Link
                to="/teams"
                className="inline-flex h-11 items-center border border-white/12 px-6 font-tech text-xs uppercase tracking-wider-2 text-muted-foreground transition hover:border-white/25 hover:text-foreground"
              >
                Cancel
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
