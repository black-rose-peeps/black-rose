import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { TechPanel, techFieldClass } from "@/features/member/components/MemberShell";
import {
  formatRiotId,
  gameIdentityConfig,
  hasIdentityForGame,
  hasRiotIdentity,
  isRiotGame,
  type MemberIdentitySource,
} from "@/features/member/utils/game-identity";
import { hasValorantIdentity as riotFieldsComplete } from "@/features/member/utils/valorant-identity";
import { cn } from "@/lib/utils";

interface GameIdentitiesFieldsProps extends MemberIdentitySource {
  focusGame?: string;
  onValorantGameNameChange: (value: string) => void;
  onValorantTaglineChange: (value: string) => void;
  onGameIdentityChange: (game: string, value: string) => void;
}

type IdentitySection = "riot" | "wwm";

function resolvePrimarySection(mainGame: string, focusGame?: string): IdentitySection | null {
  if (isRiotGame(mainGame)) return "riot";
  if (mainGame === "Where Winds Meet") return "wwm";
  if (focusGame && isRiotGame(focusGame)) return "riot";
  if (focusGame === "Where Winds Meet") return "wwm";
  return null;
}

function RiotIdFields({
  valorantGameName,
  valorantTagline,
  onValorantGameNameChange,
  onValorantTaglineChange,
  compactHelper,
}: {
  valorantGameName: string;
  valorantTagline: string;
  onValorantGameNameChange: (value: string) => void;
  onValorantTaglineChange: (value: string) => void;
  compactHelper?: boolean;
}) {
  const preview = formatRiotId({ valorantGameName, valorantTagline, gameIdentities: {} });

  return (
    <>
      {!compactHelper && (
        <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
          One Riot ID covers Valorant, League of Legends, and Teamfight Tactics on the same account.
          A name change applies to all three titles — Riot allows one free change every 90 days.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="font-tech text-label-readable uppercase text-muted-foreground">
            Game Name
          </Label>
          <Input
            value={valorantGameName}
            onChange={(e) => onValorantGameNameChange(e.target.value)}
            placeholder="PlayerName"
            maxLength={16}
            className={techFieldClass}
          />
        </div>

        <div className="space-y-2">
          <Label className="font-tech text-label-readable uppercase text-muted-foreground">
            Tagline
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-tech text-sm text-muted-foreground">
              #
            </span>
            <Input
              value={valorantTagline}
              onChange={(e) => onValorantTaglineChange(e.target.value.replace(/^#/, ""))}
              placeholder="000"
              maxLength={6}
              className={cn(techFieldClass, "pl-7")}
            />
          </div>
        </div>
      </div>

      {preview && (
        <p className="mt-4 text-xs text-muted-foreground">
          Preview: <span className="font-medium text-foreground">{preview}</span>
        </p>
      )}

      {!riotFieldsComplete(valorantGameName, valorantTagline) &&
        (valorantGameName.trim() || valorantTagline.trim()) && (
          <p className="mt-4 text-xs text-amber-400/90">
            Both game name and tagline are required.
          </p>
        )}
    </>
  );
}

function WhereWindsMeetFields({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const config = gameIdentityConfig("Where Winds Meet");

  return (
    <>
      <p className="mb-5 text-xs leading-relaxed text-muted-foreground">{config?.helperText}</p>
      <div className="space-y-2">
        <Label className="font-tech text-label-readable uppercase text-muted-foreground">
          {config?.fieldLabel}
        </Label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config?.fieldPlaceholder}
          maxLength={64}
          className={techFieldClass}
        />
      </div>
    </>
  );
}

export function GameIdentitiesFields({
  mainGame = "",
  valorantGameName,
  valorantTagline,
  gameIdentities,
  focusGame,
  onValorantGameNameChange,
  onValorantTaglineChange,
  onGameIdentityChange,
}: GameIdentitiesFieldsProps) {
  const identitySource: MemberIdentitySource = {
    mainGame,
    valorantGameName,
    valorantTagline,
    gameIdentities,
  };

  const primarySection = resolvePrimarySection(mainGame, focusGame);
  const secondarySections = useMemo(() => {
    const sections: IdentitySection[] = [];
    if (primarySection !== "riot") sections.push("riot");
    if (primarySection !== "wwm") sections.push("wwm");
    return sections;
  }, [primarySection]);

  const focusNeedsSecondary = Boolean(
    focusGame &&
      ((isRiotGame(focusGame) && primarySection !== "riot") ||
        (focusGame === "Where Winds Meet" && primarySection !== "wwm")),
  );

  const [otherOpen, setOtherOpen] = useState(
    () =>
      focusNeedsSecondary ||
      (secondarySections.includes("riot") && hasRiotIdentity(identitySource)) ||
      (secondarySections.includes("wwm") &&
        hasIdentityForGame("Where Winds Meet", identitySource)),
  );

  useEffect(() => {
    if (focusNeedsSecondary) setOtherOpen(true);
  }, [focusNeedsSecondary]);

  const mainConfig = mainGame ? gameIdentityConfig(mainGame) : null;
  const primaryLabel =
    primarySection === "riot"
      ? "Riot ID"
      : primarySection === "wwm"
        ? "Where Winds Meet"
        : (mainConfig?.panelLabel ?? "In-Game Identity");

  return (
    <div className="mt-5 flex flex-col gap-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        {mainGame
          ? "Your main game identity is shown first. Add other titles only if you compete in tournaments outside your main game."
          : "Choose a main game above, then set the in-game ID you use for that title."}
      </p>

      {primarySection ? (
        <TechPanel
          label={primaryLabel}
          title="In-Game Identity"
          className={cn(focusGame && focusGame === mainGame && "ring-1 ring-white/15")}
          action={
            <Badge
              variant="outline"
              className="rounded-none border-white/15 bg-white/5 font-tech text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              Main game
            </Badge>
          }
        >
          {primarySection === "riot" ? (
            <RiotIdFields
              valorantGameName={valorantGameName}
              valorantTagline={valorantTagline}
              onValorantGameNameChange={onValorantGameNameChange}
              onValorantTaglineChange={onValorantTaglineChange}
            />
          ) : (
            <WhereWindsMeetFields
              value={gameIdentities["Where Winds Meet"] ?? ""}
              onChange={(value) => onGameIdentityChange("Where Winds Meet", value)}
            />
          )}
        </TechPanel>
      ) : (
        <TechPanel label="In-Game Identity" title="Main Game">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Select a main game in the Player section above to unlock your primary identity fields.
          </p>
        </TechPanel>
      )}

      {secondarySections.length > 0 && (
        <Collapsible open={otherOpen} onOpenChange={setOtherOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between border border-white/8 bg-white/2 px-4 py-3 text-left transition hover:border-white/15 hover:bg-white/4">
            <span className="font-tech text-label-readable uppercase text-muted-foreground">
              Other titles
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                otherOpen && "rotate-180",
              )}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 flex flex-col gap-4">
            {secondarySections.includes("riot") && (
              <TechPanel
                label="Riot Games"
                title="Riot ID"
                className={cn(focusGame && isRiotGame(focusGame) && "ring-1 ring-white/15")}
              >
                <p className="mb-4 text-xs text-muted-foreground">
                  Valorant · League of Legends · Teamfight Tactics
                </p>
                <RiotIdFields
                  valorantGameName={valorantGameName}
                  valorantTagline={valorantTagline}
                  onValorantGameNameChange={onValorantGameNameChange}
                  onValorantTaglineChange={onValorantTaglineChange}
                  compactHelper
                />
              </TechPanel>
            )}

            {secondarySections.includes("wwm") && (
              <TechPanel
                label="Where Winds Meet"
                title="Character Name"
                className={cn(
                  focusGame === "Where Winds Meet" && "ring-1 ring-white/15",
                )}
              >
                <WhereWindsMeetFields
                  value={gameIdentities["Where Winds Meet"] ?? ""}
                  onChange={(value) => onGameIdentityChange("Where Winds Meet", value)}
                />
              </TechPanel>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}

      {primarySection && focusGame && focusGame !== mainGame && (
        <p className="text-xs text-muted-foreground">
          Registering for{" "}
          <span className="text-foreground">
            {gameIdentityConfig(focusGame)?.panelLabel ?? focusGame}
          </span>
          ?{" "}
          {isRiotGame(focusGame)
            ? "Set your shared Riot ID above."
            : "Open Other titles if needed."}
        </p>
      )}
    </div>
  );
}
