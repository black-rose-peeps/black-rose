import { useEffect, useMemo, useState } from "react";
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
  onConfirm: (pairings: PlayoffRound1Pairing[]) => void;
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

  useEffect(() => {
    if (!open) return;
    setPairings(defaultPlayoffRound1Pairings(qualifiedTeams));
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
    onConfirm(pairings);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="custom-scrollbar max-h-[90vh] overflow-y-auto border-border bg-card sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-display">Playoff Matchups</DialogTitle>
          <DialogDescription>
            Choose round-1 opponents for the {qualifiedTeams.length} qualified teams. Every qualifier
            must appear exactly once. Leave one slot as a bye when the bracket size requires it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {validationError && (
            <Alert variant="destructive">
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="font-tech text-xs uppercase tracking-wider"
              onClick={handleAutoSeed}
            >
              Auto-seed by record
            </Button>
          </div>

          <div className="space-y-3">
            {Array.from({ length: matchCount }).map((_, index) => (
              <div
                key={`playoff-pair-${index}`}
                className="grid gap-3 border border-border bg-card/40 p-4 md:grid-cols-[1fr_auto_1fr]"
              >
                <div>
                  <label className="mb-1.5 block text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    Match {index + 1} — Team A
                  </label>
                  <Select
                    value={pairings[index]?.teamA ?? BYE_VALUE}
                    onValueChange={(value) => updateSlot(index, "teamA", value)}
                  >
                    <SelectTrigger>
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

                <div className="hidden place-self-center font-display text-lg text-muted-foreground md:block">
                  vs
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    Match {index + 1} — Team B
                  </label>
                  <Select
                    value={pairings[index]?.teamB ?? BYE_VALUE}
                    onValueChange={(value) => updateSlot(index, "teamB", value)}
                  >
                    <SelectTrigger>
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
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!!validationError}
            className="font-tech uppercase tracking-wider"
            onClick={handleConfirm}
          >
            Generate playoff bracket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
