import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AdaptiveModal,
  AdaptiveModalBody,
  AdaptiveModalContent,
  AdaptiveModalDescription,
  AdaptiveModalFooter,
  AdaptiveModalHeader,
  AdaptiveModalTitle,
} from "@/components/ui/adaptive-modal";
import { GameIdentitiesFields } from "@/features/member/components/GameIdentitiesFields";
import { techFieldClass } from "@/features/member/components/MemberShell";
import { SOCIAL_PLATFORM_ORDER } from "@/features/member/constants";
import { updateMemberProfile } from "@/features/member/services/member-profile.service";
import type { MemberProfile } from "@/features/member/types";
import { validateGameIdentitiesInput } from "@/features/member/utils/game-identity";
import { profileFormStateFromMember } from "@/features/member/utils/profile-form-state";
import {
  profileGameSelectOptions,
  resolveProfileMainGame,
} from "@/features/member/utils/profile-main-game";
import { sanitizeHttpUrl } from "@/features/member/utils/validate-social-url";
import { queryKeys } from "@/lib/query-keys";

interface EditInGameIdsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: MemberProfile;
  memberId: string;
  focusGame?: string;
  onSaved?: (profile: MemberProfile) => void;
}

export function EditInGameIdsModal({
  open,
  onOpenChange,
  profile,
  memberId,
  focusGame,
  onSaved,
}: EditInGameIdsModalProps) {
  const queryClient = useQueryClient();
  const [mainGame, setMainGame] = useState("");
  const [valorantGameName, setValorantGameName] = useState("");
  const [valorantTagline, setValorantTagline] = useState("");
  const [gameIdentities, setGameIdentities] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gameOptions = useMemo(() => profileGameSelectOptions(mainGame), [mainGame]);

  useEffect(() => {
    if (!open) return;

    const form = profileFormStateFromMember(profile);
    setMainGame(form.mainGame);
    setValorantGameName(form.valorantGameName);
    setValorantTagline(form.valorantTagline);
    setGameIdentities({ ...form.gameIdentities });
    setSaving(false);
    setError(null);
  }, [open, profile]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const identityError = validateGameIdentitiesInput({
      valorantGameName,
      valorantTagline,
      gameIdentities,
    });
    if (identityError) {
      setError(identityError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await updateMemberProfile({
        memberId,
        displayName: profile.displayName,
        headline: profile.headline,
        bio: profile.bio,
        mainGame: mainGame || null,
        mainRole: profile.mainRole,
        region: profile.region,
        valorantGameName,
        valorantTagline,
        gameIdentities,
        isPublic: profile.isPublic,
        socialLinks: SOCIAL_PLATFORM_ORDER.map((platform) => {
          const link = profile.socialLinks.find((entry) => entry.platform === platform);
          return {
            platform,
            url: sanitizeHttpUrl(link?.url ?? null),
            isPublic: link?.isPublic ?? true,
          };
        }),
      });

      queryClient.setQueryData(queryKeys.memberProfile(memberId), updated);
      onSaved?.(updated);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save in-game IDs.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdaptiveModal open={open} onOpenChange={onOpenChange}>
      <AdaptiveModalContent className="flex max-h-[min(92dvh,44rem)] max-w-lg flex-col gap-0 border-white/12 bg-[oklch(0.08_0_0)] p-0 sm:max-w-xl">
        <AdaptiveModalHeader>
          <AdaptiveModalTitle>In-Game IDs</AdaptiveModalTitle>
          <AdaptiveModalDescription>
            Set your main game and the in-game names used on team rosters and tournament brackets.
          </AdaptiveModalDescription>
        </AdaptiveModalHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <AdaptiveModalBody className="flex flex-col gap-5">
            <div className="space-y-2">
              <Label className="font-tech text-label-readable uppercase text-muted-foreground">
                Main Game
              </Label>
              <Select
                value={resolveProfileMainGame(mainGame) || undefined}
                onValueChange={setMainGame}
              >
                <SelectTrigger className={techFieldClass}>
                  <SelectValue placeholder="Select a game" />
                </SelectTrigger>
                <SelectContent className="rounded-none border-white/12 bg-[oklch(0.1_0_0)]">
                  {gameOptions.map((game) => (
                    <SelectItem key={game} value={game} className="font-tech text-xs">
                      {game}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your main game identity is shown first. Add other titles if you compete outside
                your main game.
              </p>
            </div>

            <GameIdentitiesFields
              mainGame={mainGame}
              focusGame={focusGame}
              valorantGameName={valorantGameName}
              valorantTagline={valorantTagline}
              gameIdentities={gameIdentities}
              onValorantGameNameChange={setValorantGameName}
              onValorantTaglineChange={setValorantTagline}
              onGameIdentityChange={(game, value) =>
                setGameIdentities((prev) => ({ ...prev, [game]: value }))
              }
            />

            {error && <p className="text-sm text-red-400">{error}</p>}
          </AdaptiveModalBody>

          <AdaptiveModalFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-none border-white/12 bg-transparent font-tech text-ui-readable uppercase"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="clip-cta rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </AdaptiveModalFooter>
        </form>
      </AdaptiveModalContent>
    </AdaptiveModal>
  );
}
