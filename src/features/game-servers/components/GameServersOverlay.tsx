import { Link } from "@tanstack/react-router";
import { usePalworldServers } from "../hooks/usePalworldServers";

// ---------------------------------------------------------------------------
// Game registry
//
// Add future games here. Games with `hasServers: true` show live server stats.
// Games with `hasServers: false` show a static subtitle.
// ---------------------------------------------------------------------------

interface CommunityGame {
  id: string;
  label: string;
  icon: string;
  hasServers: boolean;
  subtitle?: string;
  href: "/servers" | "/tournaments" | "/guilds";
}

const COMMUNITY_GAMES: CommunityGame[] = [
  {
    id: "palworld",
    label: "Palworld",
    icon: "/Palworld Icon.jpg",
    hasServers: true,
    href: "/servers",
  },
  {
    id: "wwm",
    label: "Where Winds Meet",
    icon: "/WWM Icon.jpg",
    hasServers: false,
    subtitle: "Community · Guilds",
    href: "/guilds",
  },
  {
    id: "valorant",
    label: "Valorant",
    icon: "/Valorant Icon.png",
    hasServers: false,
    subtitle: "Community · Tournaments",
    href: "/tournaments",
  },
];

// ---------------------------------------------------------------------------
// Single floating game icon — receives server data as props (no extra fetches)
// ---------------------------------------------------------------------------

interface FloatingGameIconProps {
  game: CommunityGame;
  // For hasServers games — passed from the single hook call in HeroGameServersWidget
  onlineCount?: number;
  totalServers?: number;
  isLoadingServers?: boolean;
}

function FloatingGameIcon({
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
    <Link to={game.href} aria-label={game.label} className="group relative flex items-center">
      {/* Circle icon — 56 px */}
      <div className="relative">
        <div className="h-14 w-14 overflow-hidden rounded-full ring-1 ring-white/20 shadow-[0_2px_16px_rgba(0,0,0,0.65)] transition-all duration-200 group-hover:ring-white/45 group-hover:scale-110">
          <img
            src={game.icon}
            alt={game.label}
            width={56}
            height={56}
            className="h-full w-full object-cover opacity-90 transition-opacity duration-200 group-hover:opacity-100"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
        {/* Live online dot — only rendered when servers are actually online */}
        {showDot && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
          </span>
        )}
      </div>

      {/* Hover tooltip — slides in from left */}
      <div className="pointer-events-none absolute left-16 flex flex-col opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0">
        <div className="whitespace-nowrap border border-white/15 bg-black/85 px-3 py-2 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
          <p className="font-tech text-sm uppercase tracking-widest leading-none text-white">
            {game.label}
          </p>
          <p className="mt-1 font-tech text-xs uppercase tracking-[0.06em] leading-none text-white/50">
            {tooltipSubtitle}
          </p>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Main widget — single hook call, data passed down to each icon
// ---------------------------------------------------------------------------

export function HeroGameServersWidget() {
  // ONE hook call — shared across all game icons that need server data
  const { servers, isLoading: isLoadingServers } = usePalworldServers();
  const onlineCount = servers.filter((s) => s.online).length;
  const totalServers = servers.length;

  return (
    <div className="absolute left-8 top-24 z-10 hidden md:flex flex-col gap-2">
      {/* "Community Games" header label */}
      <p className="font-tech font-semibold text-[12px] p-2 uppercase tracking-[0.2em] text-white/40 select-none pl-1">
        Community Games
      </p>

      {/* Line + icons side by side */}
      <div className="flex items-start gap-2">
        <div className="w-px self-stretch mt-0.5" />
        <div className="flex flex-col gap-2.5">
          {COMMUNITY_GAMES.map((game) => (
            <FloatingGameIcon
              key={game.id}
              game={game}
              onlineCount={game.hasServers ? onlineCount : undefined}
              totalServers={game.hasServers ? totalServers : undefined}
              isLoadingServers={game.hasServers ? isLoadingServers : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
