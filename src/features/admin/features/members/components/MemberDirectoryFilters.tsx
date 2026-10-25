import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MemberSelect } from "@/features/member/components/MemberSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GameWithRoles } from "../../games/services/games.service";
import type { MemberVerificationStatus } from "../types";
import {
  getDirectoryIdentityLabel,
  type DirectoryMode,
  type DirectoryRoleFilter,
} from "../utils/member-directory";

interface MemberDirectoryFiltersProps {
  games: GameWithRoles[];
  selectedGame: GameWithRoles | null;
  mode: DirectoryMode;
  role: DirectoryRoleFilter;
  verification: MemberVerificationStatus | "all";
  isLoadingGames: boolean;
  count: number;
  exportDisabled: boolean;
  onGameChange: (id: string) => void;
  onModeChange: (mode: DirectoryMode) => void;
  onRoleChange: (role: DirectoryRoleFilter) => void;
  onVerificationChange: (status: MemberVerificationStatus | "all") => void;
  onExport: () => void;
}

export function MemberDirectoryFilters({
  games,
  selectedGame,
  mode,
  role,
  verification,
  isLoadingGames,
  count,
  exportDisabled,
  onGameChange,
  onModeChange,
  onRoleChange,
  onVerificationChange,
  onExport,
}: MemberDirectoryFiltersProps) {
  const roles = [
    ...new Set(selectedGame?.roles.map((item) => item.role_name.trim()).filter(Boolean) ?? []),
  ];
  const secondaryCount = selectedGame ? Number(mode !== "identity") + Number(role !== "all") : 0;
  const activeFilters = [
    ...(selectedGame
      ? [{ key: "game", label: selectedGame.display_name, clear: () => onGameChange("all") }]
      : []),
    ...(selectedGame && mode !== "identity"
      ? [{ key: "match", label: "Main game only", clear: () => onModeChange("identity") }]
      : []),
    ...(selectedGame && role !== "all"
      ? [
          {
            key: "role",
            label: role === "unknown" ? "Unknown / not provided" : role.slice(5),
            clear: () => onRoleChange("all"),
          },
        ]
      : []),
    ...(verification !== "all"
      ? [{ key: "verification", label: verification, clear: () => onVerificationChange("all") }]
      : []),
  ];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="member-directory-game">Game</Label>
          <MemberSelect
            id="member-directory-game"
            label="Game"
            value={selectedGame?.id ?? "all"}
            onValueChange={onGameChange}
            disabled={isLoadingGames}
            options={[
              { value: "all", label: "All games" },
              ...games.map((game) => ({ value: game.id, label: game.display_name })),
            ]}
          />
        </div>

        <div className="min-w-0 space-y-1.5">
          <Label htmlFor="member-directory-verification">Verification</Label>
          <Select
            value={verification}
            onValueChange={(value) =>
              onVerificationChange(value as MemberVerificationStatus | "all")
            }
          >
            <SelectTrigger id="member-directory-verification" className="min-h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Verified">Verified</SelectItem>
              <SelectItem value="Not Verified">Not Verified</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full gap-2"
            onClick={onExport}
            disabled={exportDisabled}
            title="Export all matching members, not just this page"
          >
            <Download className="h-4 w-4" />
            Export CSV ({count})
          </Button>
        </div>
      </div>
      {activeFilters.length > 0 ? (
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Active directory filters"
        >
          {activeFilters.map((filter) => (
            <Button
              key={filter.key}
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 max-w-full gap-2 whitespace-normal break-words text-left"
              aria-label={`Remove ${filter.key} filter: ${filter.label}`}
              onClick={filter.clear}
            >
              {filter.label}
              <X className="h-3 w-3 shrink-0" aria-hidden />
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 text-muted-foreground"
            aria-label="Reset directory filters"
            onClick={() => {
              onGameChange("all");
              onModeChange("identity");
              onRoleChange("all");
              onVerificationChange("all");
            }}
          >
            Reset filters
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-start gap-x-6">
        <details id="member-directory-more" className="min-w-0 open:basis-full">
          <summary className="min-h-11 cursor-pointer py-3 text-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            {secondaryCount ? `More filters (${secondaryCount})` : "More filters"}
          </summary>
          <div className="grid gap-3 pb-2 pt-1 sm:grid-cols-2">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="member-directory-mode">Match by</Label>
              <Select
                value={mode}
                onValueChange={(value) => onModeChange(value as DirectoryMode)}
                disabled={!selectedGame}
              >
                <SelectTrigger id="member-directory-mode" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identity">Has game identity</SelectItem>
                  <SelectItem value="main">Main game only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="member-directory-role">Role</Label>
              <Select
                value={role}
                onValueChange={(value) => onRoleChange(value as DirectoryRoleFilter)}
                disabled={!selectedGame}
              >
                <SelectTrigger id="member-directory-role" className="min-h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {roles.map((name) => (
                    <SelectItem key={name} value={`role:${name}`}>
                      {name}
                    </SelectItem>
                  ))}
                  <SelectItem value="unknown">Unknown / not provided</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </details>
        <details id="member-directory-help" className="min-w-0 open:basis-full">
          <summary className="min-h-11 cursor-pointer py-3 text-xs text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
            Matching &amp; export help
          </summary>
          <div className="max-w-prose space-y-2 pb-2 text-xs text-muted-foreground">
            <p>
              Roles are saved for a member’s main game only. Secondary-game roles are unknown. CSV
              includes all matching members, not just this page.
            </p>
            {selectedGame && getDirectoryIdentityLabel(selectedGame) === "Shared Riot ID" ? (
              <p>
                Riot titles share one Riot ID. Having this identity does not confirm participation
                in {selectedGame.display_name}; use Main game only for declared main-game players.
              </p>
            ) : null}
          </div>
        </details>
      </div>
    </div>
  );
}
