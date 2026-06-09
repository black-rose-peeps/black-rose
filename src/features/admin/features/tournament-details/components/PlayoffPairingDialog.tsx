import { useEffect, useMemo, useState } from "react";
import { Crown, RefreshCw, Sparkles, Swords, Trophy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TournamentTeam } from "@/features/tournaments/types";
import {
  defaultPlayoffRound1Pairings,
  playoffRound1MatchCount,
  type PlayoffRound1Pairing,
} from "../utils/managed-bracket";
import { validatePlayoffRound1Pairings } from "../utils/managed-swiss-bracket";

const BYE_VALUE = "__bye__";

interface PlayoffPairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qualifiedTeams: string[];
  teams: TournamentTeam[];
  onConfirm: (pairings: PlayoffRound1Pairing[], includeThirdPlaceMatch: boolean) => void;
}

export function PlayoffPairingDialog({
  open,
  onOpenChange,
  qualifiedTeams,
  teams,
  onConfirm,
}: PlayoffPairingDialogProps) {
  const teamByName = useMemo(() => new Map(teams.map((team) => [team.name, team])), [teams]);
  const matchCount = playoffRound1MatchCount(qualifiedTeams.length);

  const [pairings, setPairings] = useState<PlayoffRound1Pairing[]>(() =>
    defaultPlayoffRound1Pairings(qualifiedTeams),
  );
  const canIncludeThirdPlace = qualifiedTeams.length >= 4;
  const [includeThirdPlaceMatch, setIncludeThirdPlaceMatch] = useState(canIncludeThirdPlace);

  useEffect(() => {
    if (!open) return;
    setPairings(defaultPlayoffRound1Pairings(qualifiedTeams));
    setIncludeThirdPlaceMatch(qualifiedTeams.length >= 4);
  }, [open, qualifiedTeams]);

  const validationError = validatePlayoffRound1Pairings(qualifiedTeams, pairings);

  const usedTeams = useMemo(() => {
    const used = new Set<string>();
    for (const pairing of pairings) {
      if (pairing.teamA) used.add(pairing.teamA);
      if (pairing.teamB) used.add(pairing.teamB);
    }
    return used;
  }, [pairings]);

  function slotOptions(
    matchIndex: number,
    slot: "teamA" | "teamB",
  ): Array<{ value: string; label: string }> {
    const current = pairings[matchIndex]?.[slot];
    return [
      { value: BYE_VALUE, label: "Bye (open slot)" },
      ...qualifiedTeams
        .filter((team) => team === current || !usedTeams.has(team))
        .map((team) => ({
          value: team,
          label: teamByName.get(team)?.tag ? `${team} [${teamByName.get(team)?.tag}]` : team,
        })),
    ];
  }

  function updateSlot(matchIndex: number, slot: "teamA" | "teamB", raw: string) {
    const team = raw === BYE_VALUE ? null : raw;
    setPairings((current) =>
      current.map((pairing, index) =>
        index === matchIndex ? { ...pairing, [slot]: team } : pairing,
      ),
    );
  }

  function handleAutoSeed() {
    setPairings(defaultPlayoffRound1Pairings(qualifiedTeams));
  }

  function handleConfirm() {
    if (validationError) return;
    onConfirm(pairings, includeThirdPlaceMatch && canIncludeThirdPlace);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="custom-scrollbar max-h-[92vh] gap-0 overflow-y-auto border-white/10 bg-[oklch(0.07_0_0)] p-0 sm:max-w-2xl">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-linear-to-b from-amber-300/50 via-white/10 to-transparent" />

        <div className="relative border-b border-white/8 px-6 py-5">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-2 text-[10px] font-tech uppercase tracking-wider-2 text-white/45">
              <span className="h-px w-6 bg-white/20" />
              Swiss System — Championship Phase
            </div>
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center border border-amber-400/25 bg-amber-400/8">
                <Crown className="h-5 w-5 text-amber-200" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="font-display text-2xl tracking-display text-white">
                  Playoff Matchups
                </DialogTitle>
                <DialogDescription className="mt-2 max-w-lg text-sm leading-relaxed text-white/55">
                  Lock in round-one pairings for{" "}
                  <span className="text-white/80">{qualifiedTeams.length} qualifiers</span>. Each
                  team appears once — assign a bye only if the bracket size requires it.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="relative space-y-5 px-6 py-5">
          {validationError && (
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              <Swords className="h-3.5 w-3.5" />
              Round 1 — {matchCount} match{matchCount === 1 ? "" : "es"}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/12 bg-white/[0.03] font-tech text-[10px] uppercase tracking-wider-2 hover:bg-white/[0.06]"
              onClick={handleAutoSeed}
            >
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Auto-seed by record
            </Button>
          </div>

          <div className="space-y-3">
            {Array.from({ length: matchCount }).map((_, index) => (
              <div
                key={`playoff-pair-${index}`}
                className="relative overflow-hidden border border-white/10 bg-[oklch(0.09_0_0)]"
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-linear-to-b from-white/[0.04] to-transparent" />
                <div className="relative border-b border-white/8 px-4 py-2.5">
                  <p className="font-display text-sm tracking-display text-white/80">
                    Match {String(index + 1).padStart(2, "0")}
                  </p>
                </div>

                <div className="relative grid gap-4 p-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
                  <div>
                    <label className="mb-1.5 block text-[10px] font-tech uppercase tracking-wider-2 text-white/40">
                      Team A
                    </label>
                    <Select
                      value={pairings[index]?.teamA ?? BYE_VALUE}
                      onValueChange={(value) => updateSlot(index, "teamA", value)}
                    >
                      <SelectTrigger className="border-white/12 bg-black/20">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {slotOptions(index, "teamA").map((option) => (
                          <SelectItem key={`a-${index}-${option.value}`} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="hidden place-self-center pb-2 font-display text-lg tracking-display text-white/25 md:block">
                    vs
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-tech uppercase tracking-wider-2 text-white/40">
                      Team B
                    </label>
                    <Select
                      value={pairings[index]?.teamB ?? BYE_VALUE}
                      onValueChange={(value) => updateSlot(index, "teamB", value)}
                    >
                      <SelectTrigger className="border-white/12 bg-black/20">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                      <SelectContent>
                        {slotOptions(index, "teamB").map((option) => (
                          <SelectItem key={`b-${index}-${option.value}`} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {canIncludeThirdPlace && (
            <button
              type="button"
              aria-pressed={includeThirdPlaceMatch}
              onClick={() => setIncludeThirdPlaceMatch((current) => !current)}
              className={cn(
                "relative w-full overflow-hidden border text-left transition duration-200",
                includeThirdPlaceMatch
                  ? "border-orange-400/35 bg-orange-400/[0.06] shadow-[0_0_36px_-14px_rgba(251,146,60,0.4)]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]",
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b to-transparent",
                  includeThirdPlaceMatch
                    ? "from-orange-400/12"
                    : "from-white/[0.03]",
                )}
              />
              <div
                className={cn(
                  "pointer-events-none absolute inset-y-0 left-0 w-px bg-linear-to-b to-transparent",
                  includeThirdPlaceMatch ? "from-orange-300/70" : "from-white/15",
                )}
              />

              <div className="relative flex items-start gap-4 p-4 sm:p-5">
                <div
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center border",
                    includeThirdPlaceMatch
                      ? "border-orange-400/30 bg-orange-400/10"
                      : "border-white/12 bg-white/[0.04]",
                  )}
                >
                  <Trophy
                    className={cn(
                      "h-4 w-4",
                      includeThirdPlaceMatch ? "text-orange-300" : "text-white/45",
                    )}
                    strokeWidth={1.5}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={cn(
                        "font-tech text-[10px] uppercase tracking-wider-2",
                        includeThirdPlaceMatch ? "text-orange-300/80" : "text-white/40",
                      )}
                    >
                      Optional — Post-semifinals
                    </p>
                    {includeThirdPlaceMatch && (
                      <span className="border border-orange-400/25 bg-orange-400/10 px-1.5 py-0.5 font-tech text-[9px] uppercase tracking-wider text-orange-200">
                        Enabled
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-display text-lg tracking-display text-white">
                    Battle for 3rd place
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/50">
                    Adds a 3rd place match between the two semifinal losers once the playoff bracket
                    is generated.
                  </p>
                </div>

                <div
                  className={cn(
                    "mt-1 grid h-8 w-8 shrink-0 place-items-center border transition",
                    includeThirdPlaceMatch
                      ? "border-orange-400/40 bg-orange-400/15 text-orange-200"
                      : "border-white/12 bg-white/[0.03] text-white/30",
                  )}
                >
                  {includeThirdPlaceMatch && <Sparkles className="h-3.5 w-3.5" />}
                </div>
              </div>
            </button>
          )}
        </div>

        <DialogFooter className="relative gap-2 border-t border-white/8 bg-black/20 px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="border-white/12 bg-transparent font-tech text-xs uppercase tracking-wider-2 hover:bg-white/[0.04]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!!validationError}
            className="clip-cta bg-white font-tech text-xs uppercase tracking-wider-2 text-black hover:bg-white/90"
            onClick={handleConfirm}
          >
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Generate playoff bracket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
