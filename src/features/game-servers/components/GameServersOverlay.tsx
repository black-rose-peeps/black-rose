import { Link } from "@tanstack/react-router";
import { usePalworldServers } from "../hooks/usePalworldServers";
import { useActiveGames } from "@/features/admin/features/games/hooks/useGames";
import type { Game } from "@/features/admin/features/games/services/games.service";
import { useState, memo } from "react";

// ---------------------------------------------------------------------------
// Game registry
// ---------------------------------------------------------------------------

interface CommunityGame {
  id: string;
  label: string;
  icon: string;
  hasServers: boolean;
  subtitle?: string;
  href: "/servers" | "/tournaments" | "/guilds" | "/community";
}

// Helper function to convert Game to CommunityGame
function gameToCommunityGame(game: Game): CommunityGame {
  // Determine href based on game characteristics
  // Default to /community unless hardcoded for specific games
  const hasServers = game.slug === "palworld"; // Temporary: only Palworld has servers for now
  
  // Hardcoded redirects for specific games
  const hardcodedHrefs: Record<string, CommunityGame["href"]> = {
    "palworld": "/servers",
    "where-winds-meet": "/guilds",
    "valorant": "/tournaments",
  };
  
  const href = hardcodedHrefs[game.slug] || "/community";
  
  return {
    id: game.id,
    label: game.display_name,
    icon: game.icon || "/BR Text white.png", // Fallback icon if none provided
    hasServers,
    subtitle: hasServers ? undefined : "Community",
    href,
  };
}

// ---------------------------------------------------------------------------
// Single floating game icon
// ---------------------------------------------------------------------------

interface FloatingGameIconProps {
  game: CommunityGame;
  onlineCount?: number;
  totalServers?: number;
  isLoadingServers?: boolean;
}

const FloatingGameIcon = memo(function FloatingGameIcon({
  game,
  onlineCount = 0,
  totalServers = 0,
  isLoadingServers = false,
}: FloatingGameIconProps) {
  const showDot = game.hasServers && !isLoadingServers && onlineCount > 0;

  const tooltipSubtitle = game.hasServers ? (
    isLoadingServers ? (
      <span className="inline-block h-2 w-14 animate-pulse rounded bg-white/15" />
    ) : (
      <span className={onlineCount > 0 ? "text-emerald-400" : "text-white/30"}>
        {onlineCount}/{totalServers} servers
      </span>
    )
  ) : (
    <span>{game.subtitle}</span>
  );

  return (
    <Link to={game.href} aria-label={game.label} className="group relative flex items-center z-20">
      {/* Circle icon — 36px on mobile, 56px on md+ */}
      <div className="relative">
        <div className="h-12 w-12 md:h-14 md:w-14 overflow-visible rounded-full ring-1 ring-white/20 shadow-[0_2px_12px_rgba(0,0,0,0.6)] transition-all duration-200 group-hover:ring-white/45 group-hover:scale-110">
          <img
            src={game.icon}
            alt={game.label}
            width={56}
            height={56}
            className="h-full w-full object-cover opacity-90 transition-opacity duration-200 group-hover:opacity-100 rounded-full"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        {/* Live online dot */}
        {showDot && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2 md:h-3 md:w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-full w-full rounded-full bg-emerald-400" />
          </span>
        )}
      </div>

      {/* Hover tooltip — slides right, same on all screen sizes */}
      <div className="pointer-events-none absolute left-10 md:left-16 flex flex-col opacity-0 transition-opacity duration-100 group-hover:opacity-100 z-30">
        <div className="whitespace-nowrap border border-white/15 bg-black/95 px-2.5 py-1.5 md:px-3 md:py-2 shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
          <p className="font-tech text-xs md:text-sm uppercase tracking-widest leading-none text-white">
            {game.label}
          </p>
          <p className="mt-0.5 md:mt-1 font-tech text-[9px] md:text-xs uppercase tracking-[0.06em] leading-none text-white/50">
            {tooltipSubtitle}
          </p>
        </div>
      </div>
    </Link>
  );
});

// ---------------------------------------------------------------------------
// Main overlay widget — absolute-positioned, visible on all screen sizes
// ---------------------------------------------------------------------------

const MAX_VISIBLE_GAMES = 5;

export function HeroGameServersWidget() {
  // Fetch active games from database
  const { data: games, isLoading: isLoadingGames } = useActiveGames();
  
  // Single hook call — shared across all icons that need server data
  const { servers, isLoading: isLoadingServers } = usePalworldServers();
  const onlineCount = servers.filter((s) => s.online).length;
  const totalServers = servers.length;

  // Convert games to CommunityGame format
  const communityGames = games?.map(gameToCommunityGame) || [];
  
  // State for showing more games
  const [showAll, setShowAll] = useState(false);
  
  // Determine which games to show
  const visibleGames = showAll ? communityGames : communityGames.slice(0, MAX_VISIBLE_GAMES);
  const hasMoreGames = communityGames.length > MAX_VISIBLE_GAMES;

  return (
    <div className="absolute left-3 top-20 md:left-8 md:top-24 z-10 flex flex-col gap-1.5 md:gap-2">
      {/* Label — hidden on mobile to save space, visible on md+ */}
      <p className="hidden md:block font-tech font-semibold text-[12px] p-2 uppercase tracking-[0.2em] text-white/40 select-none pl-1">
        Community Games
      </p>

      {/* Line + icons side by side */}
      <div className="flex items-start gap-1.5 md:gap-2">
        <div className="w-px self-stretch mt-0.5" />
        <div className="flex flex-col gap-2 md:gap-2.5">
          {isLoadingGames ? (
            // Show skeleton while loading
            <>
              <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/10 animate-pulse" />
              <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/10 animate-pulse" />
              <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-white/10 animate-pulse" />
            </>
          ) : (
            <>
              {visibleGames.map((game) => (
                <FloatingGameIcon
                  key={game.id}
                  game={game}
                  onlineCount={game.hasServers ? onlineCount : undefined}
                  totalServers={game.hasServers ? totalServers : undefined}
                  isLoadingServers={game.hasServers ? isLoadingServers : undefined}
                />
              ))}
              {hasMoreGames && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="h-12 w-12 md:h-14 md:w-14 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 transition-all duration-200 flex items-center justify-center text-white/50 hover:text-white group cursor-pointer"
                  aria-label={showAll ? "Show less" : "Show more games"}
                >
                  <span className="font-tech text-xl md:text-xl font-medium">
                    {showAll ? "-" : "+"}
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
