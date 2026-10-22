import { useEffect, useId, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TechPanel, techFieldClass } from "@/features/member/components/MemberShell";
import {
  formatRiotId,
  gameIdentityConfig,
  hasIdentityForGame,
  hasRiotIdentity,
  isRiotGame,
  type MemberIdentitySource,
} from "@/features/member/utils/game-identity";
import { normalizeGameKey } from "@/features/teams/constants";
import { cn } from "@/lib/utils";
import type { Game } from "@/features/admin/features/games/services/games.service";
import { matchesCatalogGame } from "@/features/game-membership/rules";

interface GameIdentitiesFieldsProps extends MemberIdentitySource {
  focusGame?: string;
  onValorantGameNameChange: (value: string) => void;
  onValorantTaglineChange: (value: string) => void;
  onGameIdentityChange: (game: string, value: string) => void;
  games?: Game[];
}

type IdentitySection = "riot" | "wwm" | "palworld" | "marvel-rivals" | "dynamic";

function resolvePrimarySection(
  mainGame: string,
  focusGame?: string,
  games?: Game[],
): IdentitySection | null {
  if (isRiotGame(mainGame)) return "riot";
  if (mainGame === "Where Winds Meet") return "wwm";
  if (mainGame === "Palworld") return "palworld";
  if (mainGame === "Marvel Rivals") return "marvel-rivals";
  if (focusGame && isRiotGame(focusGame)) return "riot";
  if (focusGame === "Where Winds Meet") return "wwm";
  if (focusGame === "Palworld") return "palworld";
  if (focusGame === "Marvel Rivals") return "marvel-rivals";
  // Check if it's a dynamic game - use both exact and normalized comparison
  if (
    games &&
    games.some(
      (g) =>
        g.display_name === mainGame ||
        normalizeGameKey(g.display_name) === normalizeGameKey(mainGame),
    )
  )
    return "dynamic";
  if (
    focusGame &&
    games &&
    games.some(
      (g) =>
        g.display_name === focusGame ||
        normalizeGameKey(g.display_name) === normalizeGameKey(focusGame),
    )
  )
    return "dynamic";
  return null;
}

function RiotIdFields({
  valorantGameName,
  valorantTagline,
  gameLabels,
  onValorantGameNameChange,
  onValorantTaglineChange,
  compactHelper,
}: {
  valorantGameName: string;
  valorantTagline: string;
  gameLabels: string[];
  onValorantGameNameChange: (value: string) => void;
  onValorantTaglineChange: (value: string) => void;
  compactHelper?: boolean;
}) {
  const nameId = useId();
  const taglineId = useId();
  const preview = formatRiotId({ valorantGameName, valorantTagline, gameIdentities: {} });

  return (
    <>
      {!compactHelper && (
        <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
          One shared Riot ID for {gameLabels.join(", ")}.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label
            htmlFor={nameId}
            className="font-tech text-label-readable uppercase text-muted-foreground"
          >
            Game Name
          </Label>
          <Input
            id={nameId}
            value={valorantGameName}
            onChange={(e) => onValorantGameNameChange(e.target.value)}
            placeholder="PlayerName"
            maxLength={16}
            className={techFieldClass}
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor={taglineId}
            className="font-tech text-label-readable uppercase text-muted-foreground"
          >
            Tagline
          </Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-tech text-sm text-muted-foreground">
              #
            </span>
            <Input
              id={taglineId}
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

      {!hasRiotIdentity({ valorantGameName, valorantTagline, gameIdentities: {} }) &&
        (valorantGameName.trim() || valorantTagline.trim()) && (
          <p className="mt-4 text-xs text-amber-400/90">Both game name and tagline are required.</p>
        )}
    </>
  );
}

function WhereWindsMeetFields({
  value,
  onChange,
  games,
}: {
  value: string;
  onChange: (value: string) => void;
  games?: Game[];
}) {
  const config = gameIdentityConfig("Where Winds Meet", games);
  const inputId = useId();

  return (
    <>
      <p className="mb-5 text-xs leading-relaxed text-muted-foreground">{config?.helperText}</p>
      <div className="space-y-2">
        <Label
          htmlFor={inputId}
          className="font-tech text-label-readable uppercase text-muted-foreground"
        >
          {config?.fieldLabel}
        </Label>
        <Input
          id={inputId}
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

function PalworldFields({
  value,
  onChange,
  games,
}: {
  value: string;
  onChange: (value: string) => void;
  games?: Game[];
}) {
  const config = gameIdentityConfig("Palworld", games);
  const inputId = useId();

  return (
    <>
      <p className="mb-5 text-xs leading-relaxed text-muted-foreground">{config?.helperText}</p>
      <div className="space-y-2">
        <Label
          htmlFor={inputId}
          className="font-tech text-label-readable uppercase text-muted-foreground"
        >
          {config?.fieldLabel}
        </Label>
        <Input
          id={inputId}
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

function MarvelRivalsFields({
  value,
  onChange,
  games,
}: {
  value: string;
  onChange: (value: string) => void;
  games?: Game[];
}) {
  const config = gameIdentityConfig("Marvel Rivals", games);
  const inputId = useId();

  return (
    <>
      <p className="mb-5 text-xs leading-relaxed text-muted-foreground">{config?.helperText}</p>
      <div className="space-y-2">
        <Label
          htmlFor={inputId}
          className="font-tech text-label-readable uppercase text-muted-foreground"
        >
          {config?.fieldLabel}
        </Label>
        <Input
          id={inputId}
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

function DynamicGameFields({
  game,
  value,
  onChange,
  games,
}: {
  game: string;
  value: string;
  onChange: (value: string) => void;
  games?: Game[];
}) {
  const gameData = games?.find((g) => normalizeGameKey(g.display_name) === normalizeGameKey(game));
  const inputId = useId();
  const fieldLabel = gameData?.identity_field_label || "In-Game ID";
  const fieldPlaceholder = gameData?.identity_field_placeholder || "Your in-game name";
  const helperText =
    gameData?.identity_helper_text || "Used on team rosters and tournament brackets.";

  return (
    <>
      <p className="mb-5 text-xs leading-relaxed text-muted-foreground">{helperText}</p>
      <div className="space-y-2">
        <Label
          htmlFor={inputId}
          className="font-tech text-label-readable uppercase text-muted-foreground"
        >
          {fieldLabel}
        </Label>
        <Input
          id={inputId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={fieldPlaceholder}
          maxLength={64}
          className={techFieldClass}
        />
      </div>
    </>
  );
}

export function GameIdentitiesFields(props: GameIdentitiesFieldsProps) {
  const games = (props.games ?? []).filter((game) => game.is_active);
  if (!games.length)
    return <p className="mt-5 text-sm text-muted-foreground">No active games available.</p>;
  const findGame = (name: string) => games.find((game) => matchesCatalogGame(name, game));
  return (
    <VisibleGameIdentitiesFields
      {...props}
      games={games}
      mainGame={findGame(props.mainGame ?? "")?.display_name ?? ""}
      focusGame={findGame(props.focusGame ?? "")?.display_name}
    />
  );
}

function VisibleGameIdentitiesFields({
  mainGame = "",
  valorantGameName,
  valorantTagline,
  gameIdentities,
  focusGame,
  onValorantGameNameChange,
  onValorantTaglineChange,
  onGameIdentityChange,
  games,
}: GameIdentitiesFieldsProps) {
  const identitySource: MemberIdentitySource = {
    mainGame,
    valorantGameName,
    valorantTagline,
    gameIdentities,
  };

  const riotLabels = (games ?? [])
    .filter((game) => isRiotGame(game.display_name))
    .map((game) => game.display_name);
  const primarySection = resolvePrimarySection(mainGame, focusGame, games);
  const secondarySections = useMemo(() => {
    const sections: IdentitySection[] = [];
    if (primarySection !== "riot") sections.push("riot");
    if (primarySection !== "wwm") sections.push("wwm");
    if (primarySection !== "palworld") sections.push("palworld");
    if (primarySection !== "marvel-rivals") sections.push("marvel-rivals");
    // Add dynamic section if there are dynamic games
    // If primary is dynamic, still add it to show other dynamic games (excluding the main one)
    if (games && games.length > 0) {
      sections.push("dynamic");
    }
    const labels = {
      wwm: "Where Winds Meet",
      palworld: "Palworld",
      "marvel-rivals": "Marvel Rivals",
    };
    return sections.filter((section) => {
      if (section === "riot") return games?.some((game) => isRiotGame(game.display_name));
      if (section === "dynamic")
        return games?.some(
          (game) =>
            !isRiotGame(game.display_name) &&
            !Object.values(labels).some((label) => matchesCatalogGame(label, game)),
        );
      return games?.some((game) => matchesCatalogGame(labels[section], game));
    });
  }, [primarySection, games]);

  const focusNeedsSecondary = Boolean(
    focusGame &&
    ((isRiotGame(focusGame) && primarySection !== "riot") ||
      (focusGame === "Where Winds Meet" && primarySection !== "wwm") ||
      (focusGame === "Palworld" && primarySection !== "palworld") ||
      (focusGame === "Marvel Rivals" && primarySection !== "marvel-rivals") ||
      (games &&
        games.some((g) => normalizeGameKey(g.display_name) === normalizeGameKey(focusGame)) &&
        primarySection !== "dynamic")),
  );

  const shouldExpandOther = useMemo(
    () =>
      focusNeedsSecondary ||
      (secondarySections.includes("riot") && hasRiotIdentity(identitySource)) ||
      (secondarySections.includes("wwm") &&
        hasIdentityForGame("Where Winds Meet", identitySource, games)) ||
      (secondarySections.includes("marvel-rivals") &&
        hasIdentityForGame("Marvel Rivals", identitySource, games)) ||
      (secondarySections.includes("palworld") &&
        hasIdentityForGame("Palworld", identitySource, games)) ||
      (secondarySections.includes("dynamic") &&
        games &&
        games.some((g) => hasIdentityForGame(g.display_name, identitySource, games))),
    [
      focusNeedsSecondary,
      secondarySections,
      valorantGameName,
      valorantTagline,
      gameIdentities,
      games,
    ],
  );

  const [otherOpen, setOtherOpen] = useState(() => shouldExpandOther);

  useEffect(() => {
    if (shouldExpandOther) setOtherOpen(true);
  }, [shouldExpandOther]);

  const mainConfig = mainGame ? gameIdentityConfig(mainGame, games) : null;
  const primaryLabel =
    primarySection === "riot"
      ? "Riot ID"
      : primarySection === "wwm"
        ? "Where Winds Meet"
        : primarySection === "palworld"
          ? "Palworld"
          : primarySection === "marvel-rivals"
            ? "Marvel Rivals"
            : primarySection === "dynamic"
              ? (mainConfig?.panelLabel ?? mainGame)
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
              gameLabels={riotLabels}
              valorantGameName={valorantGameName}
              valorantTagline={valorantTagline}
              onValorantGameNameChange={onValorantGameNameChange}
              onValorantTaglineChange={onValorantTaglineChange}
            />
          ) : primarySection === "palworld" ? (
            <PalworldFields
              value={gameIdentities["Palworld"] ?? ""}
              onChange={(value) => onGameIdentityChange("Palworld", value)}
              games={games}
            />
          ) : primarySection === "marvel-rivals" ? (
            <MarvelRivalsFields
              value={gameIdentities["Marvel Rivals"] ?? ""}
              onChange={(value) => onGameIdentityChange("Marvel Rivals", value)}
              games={games}
            />
          ) : primarySection === "dynamic" ? (
            <DynamicGameFields
              game={mainConfig?.panelLabel || mainGame}
              value={gameIdentities[mainConfig?.panelLabel || mainGame] ?? ""}
              onChange={(value) => onGameIdentityChange(mainConfig?.panelLabel || mainGame, value)}
              games={games}
            />
          ) : (
            <WhereWindsMeetFields
              value={gameIdentities["Where Winds Meet"] ?? ""}
              onChange={(value) => onGameIdentityChange("Where Winds Meet", value)}
              games={games}
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
                <p className="mb-4 text-xs text-muted-foreground">{riotLabels.join(" · ")}</p>
                <RiotIdFields
                  gameLabels={riotLabels}
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
                className={cn(focusGame === "Where Winds Meet" && "ring-1 ring-white/15")}
              >
                <WhereWindsMeetFields
                  value={gameIdentities["Where Winds Meet"] ?? ""}
                  onChange={(value) => onGameIdentityChange("Where Winds Meet", value)}
                />
              </TechPanel>
            )}

            {secondarySections.includes("palworld") && (
              <TechPanel
                label="Palworld"
                title="In-Game Name"
                className={cn(focusGame === "Palworld" && "ring-1 ring-white/15")}
              >
                <PalworldFields
                  value={gameIdentities["Palworld"] ?? ""}
                  onChange={(value) => onGameIdentityChange("Palworld", value)}
                />
              </TechPanel>
            )}
            {secondarySections.includes("marvel-rivals") && (
              <TechPanel
                label="Marvel Rivals"
                title="In-Game Name"
                className={cn(focusGame === "Marvel Rivals" && "ring-1 ring-white/15")}
              >
                <MarvelRivalsFields
                  value={gameIdentities["Marvel Rivals"] ?? ""}
                  onChange={(value) => onGameIdentityChange("Marvel Rivals", value)}
                />
              </TechPanel>
            )}
            {games &&
              secondarySections.includes("dynamic") &&
              games
                .filter(
                  (g) =>
                    !isRiotGame(g.display_name) &&
                    g.display_name !== "Where Winds Meet" &&
                    g.display_name !== "Palworld" &&
                    g.display_name !== "Marvel Rivals" &&
                    // Exclude the main game if it's a dynamic game
                    !(
                      primarySection === "dynamic" &&
                      normalizeGameKey(g.display_name) === normalizeGameKey(mainGame)
                    ),
                )
                .map((game) => {
                  const gameConfig = gameIdentityConfig(game.display_name, games);
                  return (
                    <TechPanel
                      key={game.id}
                      label={game.display_name}
                      title={gameConfig?.fieldLabel || "In-Game Name"}
                      className={cn(focusGame === game.display_name && "ring-1 ring-white/15")}
                    >
                      <DynamicGameFields
                        game={game.display_name}
                        value={gameIdentities[game.display_name] ?? ""}
                        onChange={(value) => onGameIdentityChange(game.display_name, value)}
                        games={games}
                      />
                    </TechPanel>
                  );
                })}
          </CollapsibleContent>
        </Collapsible>
      )}

      {primarySection && focusGame && focusGame !== mainGame && (
        <p className="text-xs text-muted-foreground">
          Registering for{" "}
          <span className="text-foreground">
            {gameIdentityConfig(focusGame, games)?.panelLabel ?? focusGame}
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
