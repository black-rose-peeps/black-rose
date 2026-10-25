import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, ChevronsUpDown, X } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from "@/components/ui/command";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AdminTablePagination } from "@/features/admin/components/AdminTablePagination";
import { usePagination } from "@/features/admin/hooks/usePagination";
import { fetchGameRoster, changeGameMembershipAsAdmin } from "../services/game-membership.service";
import {
  GAME_MEMBERSHIP_STATUSES,
  type GameMembershipStatus,
  type GameRosterEntry,
  type MembershipGame,
} from "../types";
import {
  buildGameRosterCsv,
  filterGameRoster,
  gameMembershipChangeError,
  submitAdminMembershipChange,
  type GameRosterFilters,
} from "./admin-roster-utils";

const title = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

function RosterSelect({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={`value:${value}`}
        onValueChange={(next) => onChange(next.slice(6))}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="min-h-11">
          <SelectValue>{options.find((option) => option.value === value)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={`value:${option.value}`}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MembershipStatusForm({
  game,
  row,
  refresh,
}: {
  game: MembershipGame;
  row: GameRosterEntry;
  refresh: () => Promise<unknown>;
}) {
  const [status, setStatus] = useState<GameMembershipStatus>(
    game.is_active ? (row.membership?.status ?? "interested") : "inactive",
  );
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const validation = gameMembershipChangeError(game, row, status);
  const id = `game-membership-${row.memberId}`;
  return (
    <form
      className="space-y-2 border-t border-border pt-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setSaved(false);
        try {
          await submitAdminMembershipChange(
            game,
            row,
            status,
            reason,
            changeGameMembershipAsAdmin,
            refresh,
          );
          setSaved(true);
          setReason("");
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Could not update game membership. Try again.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="grid gap-4">
        <RosterSelect
          id={`${id}-status`}
          label="Set game membership"
          value={status}
          disabled={pending}
          onChange={(value) => {
            setStatus(value as GameMembershipStatus);
            setSaved(false);
            setError(null);
          }}
          options={GAME_MEMBERSHIP_STATUSES.filter(
            (value) => game.is_active || value === "inactive" || value === "left",
          ).map((value) => ({ value, label: title(value) }))}
        />
        <div className="space-y-1">
          <Label htmlFor={`${id}-reason`}>Optional reason</Label>
          <Input
            id={`${id}-reason`}
            value={reason}
            maxLength={1000}
            disabled={pending}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <Button type="submit" className="min-h-11" disabled={pending || !!validation}>
          {pending ? "Saving…" : "Save status"}
        </Button>
      </div>
      {validation && <p className="text-xs text-muted-foreground">{validation}</p>}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-xs text-muted-foreground">
          Game membership updated.
        </p>
      )}
    </form>
  );
}

export function GameRosterMemberDetails({
  game,
  row,
  refresh,
}: {
  game: MembershipGame;
  row: GameRosterEntry;
  refresh: () => Promise<unknown>;
}) {
  const fields = (["class", "server", "faction"] as const).filter(
    (key) => game.profile_field_config?.[key]?.enabled,
  );
  return (
    <div className="mt-6 space-y-6">
      <Badge variant={row.membership?.status === "accepted" ? "default" : "outline"}>
        Membership: {row.membership ? title(row.membership.status) : "No membership"}
      </Badge>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Saved IGN</dt>
          <dd className="break-words">{row.profile?.ign || "Saved IGN not provided"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Role</dt>
          <dd className="break-words">
            {row.profile?.roleLabel || "Not provided"}
            {game.roles.find((role) => role.id === row.profile?.roleId)?.is_active === false
              ? " (retired)"
              : ""}
          </dd>
        </div>
        {fields.map((key) => (
          <div key={key}>
            <dt className="text-muted-foreground">{game.profile_field_config![key]!.label}</dt>
            <dd className="break-words">
              {(key === "class"
                ? row.profile?.className
                : key === "server"
                  ? row.profile?.serverName
                  : row.profile?.faction) || "Not provided"}
            </dd>
          </div>
        ))}
      </dl>
      {!game.is_active && (
        <p className="text-sm text-muted-foreground">
          This game is inactive. Only inactive or left status may be set.
        </p>
      )}
      <MembershipStatusForm game={game} row={row} refresh={refresh} />
    </div>
  );
}

export interface GameRosterPanelProps {
  games: MembershipGame[];
  selectedGame: MembershipGame | null;
  onGameChange: (gameId: string) => void;
  isLoadingGames?: boolean;
  gamesError?: string | null;
  onRetryGames?: () => void;
}

export function GameRosterPanel({
  games,
  selectedGame,
  onGameChange,
  isLoadingGames,
  gamesError,
  onRetryGames,
}: GameRosterPanelProps) {
  const [gamePickerOpen, setGamePickerOpen] = useState(false);
  return (
    <section className="space-y-4" aria-label="Game membership roster">
      <p className="text-sm text-muted-foreground">
        Membership is recorded per game. An IGN, Main Game or Discord verification does not mean
        Accepted.
      </p>
      <div className="max-w-sm space-y-1">
        <Label htmlFor="game-roster-game">Roster game</Label>
        <Popover open={gamePickerOpen} onOpenChange={setGamePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              id="game-roster-game"
              type="button"
              variant="outline"
              role="combobox"
              aria-label="Roster game"
              aria-expanded={gamePickerOpen}
              disabled={isLoadingGames}
              className="min-h-11 w-full justify-between gap-3"
            >
              <span className="truncate">
                {selectedGame
                  ? `${selectedGame.display_name}${selectedGame.is_active ? "" : " (inactive — history)"}`
                  : "Select a game"}
              </span>
              <ChevronsUpDown aria-hidden="true" className="shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
          >
            <Command label="Search games">
              <CommandInput placeholder="Search games…" aria-label="Search games" />
              <CommandList>
                <CommandEmpty>No games match your search.</CommandEmpty>
                {games.map((game) => (
                  <CommandItem
                    key={game.id}
                    value={game.id}
                    keywords={[game.display_name, game.slug ?? ""]}
                    className="min-h-11"
                    onSelect={() => {
                      onGameChange(game.id);
                      setGamePickerOpen(false);
                    }}
                  >
                    <span className="min-w-0 flex-1 break-words">
                      {game.display_name}
                      {!game.is_active ? " (inactive — history)" : ""}
                    </span>
                    {selectedGame?.id === game.id && <Check aria-hidden="true" />}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {gamesError && (
        <Alert variant="destructive">
          <AlertDescription>
            {gamesError}{" "}
            <Button type="button" variant="link" onClick={onRetryGames}>
              Retry game list
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {isLoadingGames ? (
        <p role="status">Loading games…</p>
      ) : selectedGame ? (
        <SelectedGameRoster key={selectedGame.id} game={selectedGame} />
      ) : (
        <p className="py-6 text-center text-muted-foreground">
          Select a game to view its saved profiles and memberships.
        </p>
      )}
    </section>
  );
}

function SelectedGameRoster({ game }: { game: MembershipGame }) {
  const [filters, setFilters] = useState<GameRosterFilters>({});
  const [search, setSearch] = useState("");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const secondaryFilterCount = Object.entries(filters).filter(
    ([key, value]) => key !== "status" && value,
  ).length;
  // Fetch the complete saved roster, not a directory inferred from main game or IGN.
  // Local filters also drive export, which always includes all matches, not one page.
  const query = useQuery<GameRosterEntry[]>({
    queryKey: ["admin", "game-roster", game.id],
    queryFn: () => fetchGameRoster({ gameId: game.id }),
  });
  const rows = useMemo(
    () => filterGameRoster(query.data ?? [], filters, search),
    [query.data, filters, search],
  );
  const pagination = usePagination(rows);
  const roleOptions = game.roles
    .filter(
      (role) =>
        role.is_active !== false || query.data?.some((row) => row.profile?.roleId === role.id),
    )
    .map((role) => ({
      value: role.id,
      label: `${role.role_name}${role.is_active === false ? " (retired)" : ""}`,
    }));
  for (const row of query.data ?? []) {
    if (
      row.profile?.roleId &&
      !roleOptions.some((option) => option.value === row.profile?.roleId)
    ) {
      roleOptions.push({
        value: row.profile.roleId,
        label: `${row.profile.roleLabel || "Saved role"} (historical)`,
      });
    }
  }
  const fields = (["class", "server", "faction"] as const).filter(
    (key) => game.profile_field_config?.[key]?.enabled,
  );
  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((old) => ({ ...old, [key]: value || undefined }));
    pagination.setPage(1);
  };
  const filterLabels: Record<keyof GameRosterFilters, string> = {
    status: "membership status",
    roleId: "role",
    className: game.profile_field_config?.class?.label || "Class",
    serverName: game.profile_field_config?.server?.label || "Server",
    faction: game.profile_field_config?.faction?.label || "Faction",
  };
  const refresh = () => query.refetch({ throwOnError: true });
  const exportRows = () => {
    const blob = new Blob(["\ufeff", buildGameRosterCsv(game, rows)], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `game-roster-${game.slug || "export"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-4">
      {!game.is_active && (
        <Alert>
          <AlertDescription>
            This game is inactive; saved history is retained. Only inactive or left status may be
            set. New applications and member profile edits are closed.
          </AlertDescription>
        </Alert>
      )}
      <Collapsible
        open={moreFiltersOpen}
        onOpenChange={setMoreFiltersOpen}
        role="group"
        aria-label="Roster filters"
        className="space-y-3"
      >
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,18rem)_auto]">
          <div className="min-w-0 space-y-1">
            <Label htmlFor="game-roster-search">Search roster</Label>
            <Input
              id="game-roster-search"
              className="min-h-11"
              value={search}
              placeholder="Name, Discord username or IGN"
              onChange={(event) => {
                setSearch(event.target.value);
                pagination.setPage(1);
              }}
            />
          </div>
          <RosterSelect
            id="game-roster-status"
            label="Game membership status"
            value={filters.status ?? ""}
            onChange={(value) => updateFilter("status", value)}
            options={[
              { value: "", label: "All statuses / saved profiles" },
              { value: "none", label: "No membership" },
              ...GAME_MEMBERSHIP_STATUSES.map((value) => ({ value, label: title(value) })),
            ]}
          />
          {(!!roleOptions.length || !!fields.length) && (
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 gap-2 sm:col-span-2 lg:col-span-1 [&[data-state=open]>svg]:rotate-180"
              >
                More filters{secondaryFilterCount > 0 ? ` (${secondaryFilterCount})` : ""}
                <ChevronDown aria-hidden="true" className="transition-transform" />
              </Button>
            </CollapsibleTrigger>
          )}
        </div>
        <CollapsibleContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {!!roleOptions.length && (
            <RosterSelect
              id="game-roster-role"
              label="Game role"
              value={filters.roleId ?? ""}
              onChange={(value) => updateFilter("roleId", value)}
              options={[{ value: "", label: "All roles" }, ...roleOptions]}
            />
          )}
          {fields.map((key) => {
            const field = game.profile_field_config![key]!;
            const filterKey =
              key === "class" ? "className" : key === "server" ? "serverName" : "faction";
            const values = [
              ...new Set([
                ...field.options.filter((value) => value.trim()),
                ...(query.data ?? []).map((row) => row.profile?.[filterKey] ?? "").filter(Boolean),
              ]),
            ].sort();
            return (
              <RosterSelect
                key={key}
                id={`game-roster-${key}`}
                label={field.label}
                value={filters[filterKey] ?? ""}
                onChange={(value) => updateFilter(filterKey, value)}
                options={[
                  { value: "", label: `All ${field.label.toLowerCase()} values` },
                  ...values.map((value) => ({ value, label: value })),
                ]}
              />
            );
          })}
        </CollapsibleContent>
      </Collapsible>
      {(Object.values(filters).some(Boolean) || search) && (
        <div role="group" aria-label="Active roster filters" className="flex flex-wrap gap-2">
          {Object.entries(filters)
            .filter(([, value]) => value)
            .map(([key, value]) => {
              const filterKey = key as keyof GameRosterFilters;
              const label = filterLabels[filterKey];
              const displayValue =
                filterKey === "status"
                  ? value === "none"
                    ? "No membership"
                    : title(value)
                  : filterKey === "roleId"
                    ? roleOptions.find((role) => role.value === value)?.label || value
                    : value;
              return (
                <Button
                  key={key}
                  type="button"
                  variant="secondary"
                  className="h-auto min-h-11 max-w-full whitespace-normal text-left"
                  aria-label={`Remove ${label} filter`}
                  onClick={() => updateFilter(filterKey, "")}
                >
                  <span className="break-words">
                    {label}: {displayValue}
                  </span>
                  <X aria-hidden="true" />
                </Button>
              );
            })}
          {search && (
            <Button
              type="button"
              variant="secondary"
              className="h-auto min-h-11 max-w-full whitespace-normal text-left"
              aria-label="Remove search filter"
              onClick={() => {
                setSearch("");
                pagination.setPage(1);
              }}
            >
              <span className="break-words">Search: {search}</span>
              <X aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className="text-sm text-muted-foreground">
          {rows.length} matching entries
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={query.isLoading || !!query.error || !rows.length}
          onClick={exportRows}
        >
          Export CSV ({rows.length})
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setFilters({});
            setSearch("");
            pagination.setPage(1);
          }}
        >
          Clear roster filters
        </Button>
        <p className="text-xs text-muted-foreground">
          Exports all filtered rows, not just this page. No private notes, emails or IDs.
        </p>
      </div>
      {query.isLoading ? (
        <p role="status">Loading game roster…</p>
      ) : query.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {query.error instanceof Error ? query.error.message : "Could not load game roster."}{" "}
            <Button type="button" variant="link" onClick={() => void query.refetch()}>
              Retry roster
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {!rows.length ? (
            <p className="py-8 text-center text-muted-foreground">
              {query.data?.length
                ? "No roster entries match these filters."
                : "No saved profiles or memberships for this game."}
            </p>
          ) : (
            <ul className="space-y-3">
              {pagination.paginatedItems.map((row) => (
                <li key={row.memberId} className="space-y-3 rounded-md border border-border p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-medium break-words">{row.displayName}</p>
                      <p className="text-xs text-muted-foreground break-all">
                        @{row.discordUsername}
                      </p>
                    </div>
                    <Badge
                      variant={
                        row.membership?.status === "accepted"
                          ? "default"
                          : row.membership?.status === "applying"
                            ? "secondary"
                            : "outline"
                      }
                      className={`h-fit shrink-0 ${row.membership?.status === "accepted" ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15" : ""}`}
                    >
                      Membership: {row.membership ? title(row.membership.status) : "No membership"}
                    </Badge>
                  </div>
                  <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                      <dt className="text-xs text-muted-foreground">Saved IGN</dt>
                      <dd className="min-w-0 break-words">
                        {row.profile?.ign || "Saved IGN not provided"}
                      </dd>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                      <dt className="text-xs text-muted-foreground">Role</dt>
                      <dd className="min-w-0 break-words">
                        {row.profile?.roleLabel || "Not provided"}
                        {game.roles.find((role) => role.id === row.profile?.roleId)?.is_active ===
                        false
                          ? " (retired)"
                          : ""}
                      </dd>
                    </div>
                  </dl>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11 w-full sm:w-auto"
                        aria-label={`View member details for ${row.displayName}`}
                      >
                        View member details
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="custom-scrollbar w-full overflow-y-auto sm:max-w-lg">
                      <SheetHeader className="pr-6 text-left">
                        <SheetTitle className="break-words">{row.displayName}</SheetTitle>
                        <SheetDescription className="break-words">
                          @{row.discordUsername} · {game.display_name}
                        </SheetDescription>
                      </SheetHeader>
                      <GameRosterMemberDetails game={game} row={row} refresh={refresh} />
                    </SheetContent>
                  </Sheet>
                </li>
              ))}
            </ul>
          )}
          <AdminTablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            rangeStart={pagination.rangeStart}
            rangeEnd={pagination.rangeEnd}
            onPageChange={pagination.setPage}
          />
        </>
      )}
    </div>
  );
}
