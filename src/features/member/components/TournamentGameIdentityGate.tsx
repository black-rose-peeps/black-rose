import { Link } from "@tanstack/react-router";
import { AlertCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemberProfileQuery } from "@/features/member/queries/member-profile-queries";
import {
  formatIdentityForGame,
  gameIdentityConfig,
  hasIdentityForGame,
  isRiotGame,
} from "@/features/member/utils/game-identity";
import { RegisterNowButtonSkeleton } from "@/features/tournaments/components/SelectTeamRegistrationSkeleton";

interface TournamentGameIdentityGateProps {
  memberId: string;
  tournamentGame: string;
  children: React.ReactNode;
}

export function TournamentGameIdentityGate({
  memberId,
  tournamentGame,
  children,
}: TournamentGameIdentityGateProps) {
  const profileQuery = useMemberProfileQuery(memberId);
  const profile = profileQuery.data;

  if (profileQuery.isPending) {
    return <RegisterNowButtonSkeleton />;
  }

  const source = {
    mainGame: profile?.mainGame ?? "",
    valorantGameName: profile?.valorantGameName ?? "",
    valorantTagline: profile?.valorantTagline ?? "",
    gameIdentities: profile?.gameIdentities ?? {},
  };

  if (profile && hasIdentityForGame(tournamentGame, source)) {
    return <>{children}</>;
  }

  const config = gameIdentityConfig(tournamentGame);
  const gameLabel = config?.panelLabel ?? tournamentGame;
  const riotTournament = isRiotGame(tournamentGame);

  return (
    <div className="flex max-w-md flex-col gap-4 border border-amber-400/25 bg-amber-400/5 px-5 py-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <p className="font-tech text-label-readable uppercase text-amber-200">
            {riotTournament ? "Riot ID required" : `${gameLabel} in-game ID required`}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {riotTournament ? (
              <>
                This tournament is for {gameLabel}. Add your shared Riot ID (game name + tagline) —
                the same ID used across Valorant, League of Legends, and TFT on your account.
              </>
            ) : (
              <>
                This tournament is for {gameLabel}. Add your{" "}
                {config?.fieldLabel.toLowerCase() ?? "in-game identity"} before registering — even
                if your profile main game is different.
              </>
            )}
          </p>
        </div>
      </div>
      <Button
        asChild
        className="clip-cta h-11 w-full rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90 sm:w-auto"
      >
        <Link to="/dashboard/profile" search={{ tab: "player", focusGame: tournamentGame }}>
          <Pencil className="h-3.5 w-3.5" />
          {riotTournament ? "Set Riot ID" : `Set ${gameLabel} ID`}
        </Link>
      </Button>
    </div>
  );
}

export function getMemberIdentityForGame(
  profile: {
    mainGame: string;
    valorantGameName: string;
    valorantTagline: string;
    gameIdentities: Record<string, string>;
  },
  game: string,
): string | null {
  return formatIdentityForGame(game, profile);
}
