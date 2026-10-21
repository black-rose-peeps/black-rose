import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AdaptiveModal,
  AdaptiveModalBody,
  AdaptiveModalContent,
  AdaptiveModalDescription,
  AdaptiveModalFooter,
  AdaptiveModalHeader,
  AdaptiveModalTitle,
} from "@/components/ui/adaptive-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTeam } from "@/features/admin/features/teams/services/teams.service";
import { fetchMemberProfileById } from "@/features/member/services/member-profile.service";
import { techFieldClass } from "@/features/member/components/MemberShell";
import {
  MAX_TEAM_SIZE,
  MIN_TEAM_SIZE,
  getRoleOptionsForGame,
  normalizeGameKey,
  resolveRoleForGame,
  dbGameToLegacyGame,
} from "@/features/teams/constants";
import { useActiveGames, useGameRoles } from "@/features/admin/features/games/hooks/useGames";
import type { Team } from "@/features/teams/types";
import type { TeamMemberRole } from "@/features/teams/types";

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  onCreated: (team: Team) => void;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  memberId,
  onCreated,
}: CreateTeamDialogProps) {
  const { data: dbGames, isLoading: gamesLoading, isError: gamesError } = useActiveGames();
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [game, setGame] = useState<Team["game"] | "">("");
  const [captainRole, setCaptainRole] = useState<TeamMemberRole>("TBD");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert database games to legacy format for backward compatibility
  const gameOptions = (gamesLoading || gamesError ? [] : (dbGames ?? []))
    .filter((g) => g.is_active && g.name !== "Multi")
    .map((g) => ({ value: dbGameToLegacyGame(g), label: g.display_name, id: g.id }));
  const selectedGame = gameOptions.find((option) => option.value === game);
  const gameId = selectedGame?.id;
  const { data: gameRoles } = useGameRoles(gameId || "");

  const roleOptions = getRoleOptionsForGame(game, gameRoles);

  useEffect(() => {
    if (!open) return;

    setName("");
    setTag("");
    setGame("");
    setCaptainRole("TBD");
    setError(null);

    let cancelled = false;
    fetchMemberProfileById(memberId)
      .then((profile) => {
        if (cancelled || !profile) return;
        const normalizedGame = normalizeGameKey(profile.mainGame);
        const nextGame = normalizedGame ?? "";
        setGame(nextGame);
        setCaptainRole(resolveRoleForGame(profile.mainRole, nextGame));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [open, memberId]);

  useEffect(() => {
    setCaptainRole((current) => resolveRoleForGame(current, game));
  }, [game]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!selectedGame) {
        setError("Game must be selected before creating a team.");
        return;
      }
      const team = await createTeam({
        name: name.trim(),
        tag: tag.trim().toUpperCase(),
        game: selectedGame.value,
        gameId: selectedGame.id,
        captainMemberId: memberId,
        captainRole,
      });
      onCreated(team);
      toast.success(`Team "${name}" created successfully`);
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create team";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdaptiveModal open={open} onOpenChange={onOpenChange}>
      <AdaptiveModalContent className="flex max-w-md flex-col gap-0 border-white/12 bg-[oklch(0.08_0_0)] p-0">
        <AdaptiveModalHeader>
          <AdaptiveModalTitle>Create Team</AdaptiveModalTitle>
          <AdaptiveModalDescription>
            You will be set as captain. Choose the game first — your roster role is based on that
            game, not your profile main game.
          </AdaptiveModalDescription>
        </AdaptiveModalHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <AdaptiveModalBody className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label className="font-tech text-label-readable uppercase text-muted-foreground">
                Team Name
              </Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Novellino eSports"
                maxLength={40}
                className={techFieldClass}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-tech text-label-readable uppercase text-muted-foreground">
                Team Tag (2–5 letters)
              </Label>
              <Input
                required
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase().slice(0, 5))}
                placeholder="NE"
                minLength={2}
                maxLength={5}
                pattern="[A-Z]{2,5}"
                className={`${techFieldClass} font-tech uppercase tracking-wider-2`}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-tech text-label-readable uppercase text-muted-foreground">
                Primary Game
              </Label>
              <Select
                value={selectedGame?.value ?? ""}
                onValueChange={(v) => setGame(v as Team["game"])}
                disabled={gamesLoading || gamesError || gameOptions.length === 0}
              >
                <SelectTrigger className={techFieldClass}>
                  <SelectValue placeholder="Select an active game" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-white/12 bg-[oklch(0.1_0_0)]">
                  {gameOptions.map((g) => (
                    <SelectItem key={g.value} value={g.value} className="font-tech text-xs">
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {gamesError ? (
                <p role="alert" className="text-sm text-red-400">
                  Unable to load active games.
                </p>
              ) : !gamesLoading && gameOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active games available.</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="font-tech text-label-readable uppercase text-muted-foreground">
                Your Role on This Team
              </Label>
              <Select
                value={captainRole}
                onValueChange={(v) => setCaptainRole(v as TeamMemberRole)}
              >
                <SelectTrigger className={techFieldClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none border-white/12 bg-[oklch(0.1_0_0)]">
                  {roleOptions.map((role) => (
                    <SelectItem key={role} value={role} className="font-tech text-xs">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-3 border border-white/8 bg-white/[0.02] px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Teams need at least{" "}
                <strong className="text-foreground">{MIN_TEAM_SIZE} active members</strong> for most
                tournaments. Max roster is {MAX_TEAM_SIZE}. You can change your role later on the
                team page.
              </p>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}
          </AdaptiveModalBody>

          <AdaptiveModalFooter className="sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-none border-white/15 font-tech text-ui-readable uppercase"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !gameId}
              className="clip-cta inline-flex h-11 items-center rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Team
            </Button>
          </AdaptiveModalFooter>
        </form>
      </AdaptiveModalContent>
    </AdaptiveModal>
  );
}
