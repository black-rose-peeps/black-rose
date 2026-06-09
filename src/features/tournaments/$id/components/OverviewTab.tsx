import { useMemo } from "react";
import { Calendar, Trophy } from "lucide-react";
import { PodiumWinnersShowcase } from "../../components/PodiumWinnersShowcase";
import { SwissResultsBoard } from "../../components/SwissResultsBoard";
import { isSwissFormat } from "../../constants/formats";
import { withTeamTags } from "../../utils/team-tags";
import { computeSwissStandingsFromBracket } from "../../utils/swiss-standings";
import type { TournamentDetail } from "../../types";

interface OverviewTabProps {
  tournament: TournamentDetail;
  teamTags?: Map<string, string>;
}

export function OverviewTab({ tournament: t, teamTags }: OverviewTabProps) {
  const isDone = t.status === "Completed" || t.status === "Archived";
  const isSwiss = isSwissFormat(t.format);

  const swissStandings = useMemo(() => {
    if (!isSwiss || !t.bracket.length) return null;
    return computeSwissStandingsFromBracket(t.bracket);
  }, [isSwiss, t.bracket]);

  const showSwissResults =
    isDone &&
    isSwiss &&
    swissStandings !== null &&
    swissStandings.some((entry) => entry.status === "advanced" || entry.status === "eliminated");

  const showElimResults = isDone && (t.placements?.length ?? 0) > 0;
  const showSwissPodium = isSwiss && showElimResults;
  const showElimPodium = !isSwiss && showElimResults;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="flex flex-col gap-8 lg:col-span-2">
        {showSwissResults && swissStandings && (
          <section className="space-y-4">
            <SwissResultsBoard
              variant="public"
              advanced={withTeamTags(
                swissStandings
                  .filter((entry) => entry.status === "advanced")
                  .map((entry) => ({ team: entry.team, record: entry.record })),
                teamTags,
              )}
              eliminated={withTeamTags(
                swissStandings
                  .filter((entry) => entry.status === "eliminated")
                  .map((entry) => ({ team: entry.team, record: entry.record })),
                teamTags,
              )}
            />
          </section>
        )}

        {(showSwissPodium || showElimPodium) && t.placements && (
          <section className="space-y-4">
            <PodiumWinnersShowcase placements={t.placements} teamTags={teamTags} />
          </section>
        )}

        <Card icon={<Trophy className="h-4 w-4" />} title="Prize Breakdown">
          <div className="divide-y divide-white/6">
            {t.prizeBreakdown.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Prize distribution will be announced by tournament staff.
              </p>
            ) : (
              t.prizeBreakdown.map((tier, i) => (
                <div key={`${tier.place}-${i}`} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-display text-2xl tracking-display ${
                        i === 0 ? "text-white" : i === 1 ? "text-white/60" : "text-white/30"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm text-muted-foreground">{tier.place}</span>
                  </div>
                  <span
                    className={`font-display text-xl tracking-display ${i === 0 ? "text-white" : "text-muted-foreground"}`}
                  >
                    {tier.prize}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card icon={<Calendar className="h-4 w-4" />} title="Tournament Schedule">
          <ol className="relative ml-2 border-l border-white/10">
            {t.schedule.map((entry, i) => (
              <li key={`${entry.phase}-${i}`} className="mb-6 ml-6 last:mb-0">
                <span className="absolute left-[-5px] mt-1.5 h-2.5 w-2.5 border border-white/20 bg-background" />
                <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                  {entry.date}
                </div>
                <div className="mt-1 text-sm font-medium">{entry.phase}</div>
                {entry.note && (
                  <div className="mt-0.5 text-xs text-muted-foreground">{entry.note}</div>
                )}
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <Card title="Tournament Info">
          <dl className="flex flex-col gap-4">
            <InfoRow label="Organizer" value={t.organizer} />
            <InfoRow label="Contact" value={t.contact} />
            <InfoRow label="Format" value={t.format} />
            <InfoRow label="Region" value={t.region} />
            <InfoRow label="Registration Deadline" value={t.registrationDeadline} />
            <InfoRow label="Start Date" value={t.startDate} />
          </dl>
        </Card>

        <Card title="Team Slots">
          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between">
              <span className="font-display text-4xl tracking-display">{t.teamsRegistered}</span>
              <span className="mb-1 text-sm text-muted-foreground">/ {t.teamCap} teams</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-white/8">
              <div
                className="h-1.5 rounded-full bg-white transition-all"
                style={{ width: `${Math.round((t.teamsRegistered / t.teamCap) * 100)}%` }}
              />
            </div>
            <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              {t.teamCap - t.teamsRegistered > 0
                ? `${t.teamCap - t.teamsRegistered} slots remaining`
                : "Registration full"}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/8 bg-[oklch(0.07_0_0)]">
      <div className="flex items-center gap-2.5 border-b border-white/8 px-5 py-4">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h3 className="text-[11px] font-tech uppercase tracking-wider-2 text-foreground">{title}</h3>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
