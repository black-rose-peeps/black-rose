import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { AdaptiveModal, AdaptiveModalContent } from "@/components/ui/adaptive-modal";
import {
  MEMBER_DIRECTORY_PAGE_SIZE,
  searchVerifiedMembersDirectory,
  type MemberDirectoryEntry,
} from "@/features/member/services/member-search.service";
import { ArenaEmptyState } from "@/features/shared/components/ArenaEmptyState";
import { MemberAvatar } from "./MemberAvatar";
import { MemberNameStack } from "./MemberNameStack";
import { cn } from "@/lib/utils";

interface MemberSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function clearSearchButton(onClick: () => void) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="clip-cta inline-flex min-h-11 items-center border border-white/15 bg-white/4 px-4 font-tech text-ui-readable uppercase transition hover:border-white/25 hover:bg-white/8"
    >
      Clear search
    </button>
  );
}

export function MemberSearchDialog({ open, onOpenChange }: MemberSearchDialogProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<MemberDirectoryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(MEMBER_DIRECTORY_PAGE_SIZE);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasQuery = search.trim().length > 0;
  const showInitialSkeleton = searching && results.length === 0 && hasQuery;

  useEffect(() => {
    if (!open) {
      setSearch("");
      setPage(1);
      setError(null);
      setResults([]);
      setTotal(0);
      setPageSize(MEMBER_DIRECTORY_PAGE_SIZE);
    }
  }, [open]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const query = search.trim();
      if (!query) {
        setResults([]);
        setTotal(0);
        setSearching(false);
        return;
      }

      setSearching(true);
      setError(null);
      searchVerifiedMembersDirectory(query, page)
        .then((result) => {
          if (cancelled) return;
          setResults(result.members);
          setTotal(result.total);
          setPageSize(result.pageSize);
        })
        .catch((err) => {
          if (cancelled) return;
          setResults([]);
          setTotal(0);
          setError(err instanceof Error ? err.message : "Search failed.");
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, search, page]);

  function openProfile(slug: string) {
    onOpenChange(false);
    navigate({ to: "/members/$slug", params: { slug } });
  }

  return (
    <AdaptiveModal open={open} onOpenChange={onOpenChange}>
      <AdaptiveModalContent
        mobileSide="top"
        mobileSize="compact"
        hideMobileHandle
        className="flex w-full max-w-xl flex-col gap-0 overflow-hidden border-white/12 bg-[oklch(0.08_0_0)] p-0 shadow-2xl shadow-black/40 sm:max-w-xl"
      >
        <div className="shrink-0 border-b border-white/8 px-4 py-3 sm:px-5 sm:py-4">
          <p className="font-tech text-label-readable uppercase text-muted-foreground">
            Black Rose Directory
          </p>
          <p className="mt-0.5 font-display text-lg tracking-display text-foreground sm:text-xl">
            Find a member
          </p>
        </div>

        <Command
          shouldFilter={false}
          className="flex min-h-0 flex-1 flex-col rounded-none bg-transparent [&_[cmdk-input-wrapper]]:border-white/8 [&_[cmdk-input-wrapper]]:px-3 sm:[&_[cmdk-input-wrapper]]:px-4 [&_[cmdk-input-wrapper]_svg]:text-muted-foreground"
        >
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Display name or Discord username…"
            className="h-11 font-tech text-sm uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal sm:h-12"
          />

          <CommandList className="custom-scrollbar max-h-[min(38vh,12rem)] sm:max-h-80">
            {!hasQuery ? (
              <div className="px-4 py-3">
                <ArenaEmptyState
                  embedded
                  eyebrow="Verified Directory"
                  title={
                    <>
                      Find your <span className="text-stroke">guildmates.</span>
                    </>
                  }
                  description="Search verified members by display name or Discord handle."
                  className="border-white/6 bg-transparent"
                />
              </div>
            ) : showInitialSkeleton ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            ) : error ? (
              <div className="px-4 py-3">
                <ArenaEmptyState
                  embedded
                  eyebrow="Search Error"
                  title={
                    <>
                      Couldn&apos;t complete <span className="text-stroke">search.</span>
                    </>
                  }
                  description={error}
                  actions={clearSearchButton(() => setSearch(""))}
                  className="border-red-400/15 bg-red-400/[0.03]"
                />
              </div>
            ) : results.length === 0 ? (
              <div className="px-4 py-3">
                <ArenaEmptyState
                  embedded
                  eyebrow="No Matches"
                  title={
                    <>
                      Nobody <span className="text-stroke">found.</span>
                    </>
                  }
                  description={`No verified member matches "${search.trim()}". Try a different display name or Discord handle.`}
                  actions={clearSearchButton(() => setSearch(""))}
                  className="border-white/6 bg-transparent"
                />
              </div>
            ) : (
              <CommandGroup
                heading={
                  searching ? "Searching…" : `${total} member${total === 1 ? "" : "s"} found`
                }
                className="px-2 pb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-tech [&_[cmdk-group-heading]]:text-label-readable [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:text-muted-foreground/70"
              >
                {results.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={`${member.displayName} ${member.discordUsername}`}
                    onSelect={() => openProfile(member.profileSlug)}
                    className={cn(
                      "min-h-11 cursor-pointer rounded-none px-3 py-3 aria-selected:bg-white/6",
                      searching && "pointer-events-none opacity-60",
                    )}
                  >
                    <MemberAvatar
                      avatarUrl={member.avatarUrl}
                      initials={member.avatarInitials}
                      name={member.displayName}
                      className="mr-3 h-9 w-9 shrink-0 text-xs"
                    />
                    <MemberNameStack
                      displayName={member.displayName}
                      discordUsername={member.discordUsername}
                      size="sm"
                      className="min-w-0 flex-1"
                    />
                    <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>

        <div className="flex shrink-0 items-center justify-between border-t border-white/8 px-4 py-2.5 text-xs text-muted-foreground safe-bottom">
          <div className="flex items-center gap-3">
            {hasQuery && total > pageSize ? (
              <>
                <button
                  type="button"
                  disabled={page <= 1 || searching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="touch-target inline-flex items-center gap-1 font-tech uppercase tracking-wider transition hover:text-foreground disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || searching}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="touch-target inline-flex items-center gap-1 font-tech uppercase tracking-wider transition hover:text-foreground disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-tech uppercase tracking-wider">
                <Search className="h-3 w-3" />
                Verified members only
              </span>
            )}
          </div>
          <span className="hidden font-tech uppercase tracking-wider sm:inline">
            ↑↓ navigate · Enter open · Esc close
          </span>
        </div>
      </AdaptiveModalContent>
    </AdaptiveModal>
  );
}
