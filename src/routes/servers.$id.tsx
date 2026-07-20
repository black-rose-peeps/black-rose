import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { ArrowLeft, Copy, Check, Lock, X, Users } from "lucide-react";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { usePalworldServerDetail } from "@/features/game-servers/hooks/usePalworldServerDetail";
import { usePalworldPlayers } from "@/features/game-servers/hooks/usePalworldPlayers";
import { useMemberSession } from "@/features/auth/hooks/useMemberSession";
import { hasFullMemberAccess } from "@/features/auth/utils/routes";
import { fetchPalworldJoinInfo } from "@/features/game-servers/functions/palworld-join.functions";
import type {
  PalworldServerDetail,
  PalworldServerSettings,
  PalworldPlayer,
} from "@/features/game-servers/types";
import type { PalworldJoinInfo } from "@/features/game-servers/functions/palworld-join.functions";

export const Route = createFileRoute("/servers/$id")({
  head: () => ({
    meta: [{ title: "Server — Black Rose" }],
  }),
  component: ServerDetailPage,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatUptime(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatMultiplier(value: unknown): string {
  if (value === undefined || value === null) return "—";
  const num = Number(value);
  if (isNaN(num)) return "—";
  return `×${num.toFixed(1)}`;
}

function formatBool(value: unknown): ReactNode {
  if (value === undefined || value === null) return <span className="text-white/30">—</span>;
  return value ? (
    <span className="text-emerald-400">Yes</span>
  ) : (
    <span className="text-white/30">No</span>
  );
}

function formatString(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PalworldIcon({ className }: { className?: string }) {
  return (
    <img
      src="/64x64 Palworld Icon.png"
      alt="Palworld"
      width={64}
      height={64}
      className={className}
    />
  );
}

function StatusBadge({ online }: { online: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 font-tech text-label-readable uppercase backdrop-blur-md ${
        online
          ? "border-emerald-400/25 bg-black/70 text-emerald-300"
          : "border-white/8 bg-black/70 text-white/30"
      }`}
    >
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        {" "}
        {online && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
            online ? "bg-emerald-400" : "bg-white/20"
          }`}
        />
      </span>
      {online ? "Online" : "Offline"}
    </div>
  );
}

interface SettingRowProps {
  label: string;
  value: ReactNode;
}
function SettingRow({ label, value }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/5 py-2">
      <span className="font-tech text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-display text-sm tracking-display text-white">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Join Server panel — members-only connection details
// ---------------------------------------------------------------------------

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/15 bg-white/5 transition-colors hover:border-white/30 hover:bg-white/10"
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3 w-3 text-emerald-400" />
      ) : (
        <Copy className="h-3 w-3 text-white/50" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Join Server modal — connection details
// ---------------------------------------------------------------------------

function JoinServerModal({
  joinInfo,
  onClose,
}: {
  joinInfo: PalworldJoinInfo;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-white/12 bg-[oklch(0.07_0_0)] shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
        {/* Corner brackets */}
        <span className="pointer-events-none absolute left-0 top-0 h-5 w-5 border-l border-t border-white/25" />
        <span className="pointer-events-none absolute right-0 top-0 h-5 w-5 border-r border-t border-white/25" />
        <span className="pointer-events-none absolute bottom-0 left-0 h-5 w-5 border-b border-l border-white/15" />
        <span className="pointer-events-none absolute bottom-0 right-0 h-5 w-5 border-b border-r border-white/15" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-emerald-400/50 via-emerald-400/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.1]" />

        {/* Header */}
        <div className="relative flex items-start justify-between border-b border-white/8 px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex items-center gap-3">
            <span className="relative mt-1.5 flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <div>
              <p className="font-tech text-[10px] uppercase tracking-wider text-emerald-300/70">
                Connection Ready
              </p>
              <h2 className="mt-1 font-display text-3xl tracking-display text-white leading-none">
                Join Server
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center border border-white/15 bg-white/5 transition-colors hover:border-white/30 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-4 w-4 text-white/60" />
          </button>
        </div>

        {/* Body */}
        <div className="relative px-5 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Server IP */}
            <div className="relative border border-white/10 bg-white/[0.03] px-6 py-5">
              <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-emerald-400/25" />
              <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-emerald-400/25" />
              <p className="mb-3 font-tech text-[10px] uppercase tracking-wider text-white/35">
                Server IP
              </p>
              <div className="flex items-center gap-3">
                <code className="min-w-0 flex-1 break-all font-mono text-xl text-white">
                  {joinInfo.host}
                </code>
                <CopyButton value={joinInfo.host} />
              </div>
            </div>

            {/* Password */}
            <div className="relative border border-white/10 bg-white/[0.03] px-6 py-5">
              <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-emerald-400/25" />
              <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-emerald-400/25" />
              <p className="mb-3 font-tech text-[10px] uppercase tracking-wider text-white/35">
                Password
              </p>
              {joinInfo.joinPassword ? (
                <div className="flex items-center gap-3">
                  <code className="min-w-0 flex-1 truncate font-mono text-xl text-white">
                    {joinInfo.joinPassword}
                  </code>
                  <CopyButton value={joinInfo.joinPassword} />
                </div>
              ) : (
                <p className="font-mono text-xl text-white/30">No password</p>
              )}
            </div>
          </div>

          {/* Footer instruction */}
          <div className="relative mt-4 flex items-center gap-3 border border-white/8 bg-white/[0.02] px-4 py-3 sm:mt-6 sm:px-5 sm:py-4">
            <div className="absolute inset-y-0 left-0 w-px bg-emerald-400/30" />
            <p className="font-tech text-[10px] uppercase tracking-wider text-white/40 leading-relaxed">
              Palworld → Multiplayer → Join with IP → enter the address above
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface JoinServerPanelProps {
  serverId: string;
}

function JoinServerPanel({ serverId }: JoinServerPanelProps) {
  const session = useMemberSession();
  const { id: routeId } = Route.useParams();
  const [joinInfo, setJoinInfo] = useState<PalworldJoinInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const isAuthenticated = session !== null;
  const isVerified = session !== null && hasFullMemberAccess(session.role);

  // The current page path — passed to /login so user returns here after auth
  const returnPath = `/servers/${routeId}` as const;

  // ── ACE server — exclusive access, connection details not public ──────────
  // server-4 is the ACE server; its join info is intentionally withheld from
  // all users regardless of authentication or verification status.
  if (serverId === "server-4") {
    return (
      <div className="mt-8 relative flex flex-col gap-3 border border-white/8 bg-white/2 p-5 sm:flex-row sm:items-center sm:gap-5">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-white/15 to-transparent" />
        <div className="flex items-start gap-3 flex-1">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-white/25" />
          <div>
            <p className="font-tech text-[10px] uppercase tracking-wider text-white/50">
              Exclusive Access
            </p>
            <p className="mt-1 text-sm leading-snug text-white/40">
              Connection details for this server are not publicly available. Access is by invitation
              only.
            </p>
          </div>
        </div>
        <div className="clip-cta shrink-0 inline-flex h-10 cursor-not-allowed items-center gap-2 border border-white/10 bg-white/3 px-5 font-tech text-[10px] uppercase tracking-wider text-white/25 sm:self-center">
          <Lock className="h-3 w-3" />
          Exclusive
        </div>
      </div>
    );
  }

  async function handleReveal() {
    if (!session) return;

    // Already fetched — just reopen the modal, no need to refetch.
    if (joinInfo) {
      setShowModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const info = await fetchPalworldJoinInfo({
        data: { serverId, memberId: session.id },
      });
      setJoinInfo(info);
      setShowModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load connection details.");
    } finally {
      setIsLoading(false);
    }
  }

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="mt-8 relative flex flex-col gap-3 border border-white/8 bg-white/2 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-white/15 to-transparent" />
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-white/25" />
          <div>
            <p className="font-tech text-[10px] uppercase tracking-wider text-white/50">
              Members Only
            </p>
            <p className="mt-1 text-sm leading-snug text-white/40">
              Sign in to view the connection details for this server.
            </p>
          </div>
        </div>
        <Link
          to="/login"
          search={{ redirect_to: returnPath }}
          className="clip-cta shrink-0 inline-flex h-10 items-center gap-2 bg-foreground px-5 font-tech text-[10px] uppercase tracking-wider text-background transition hover:bg-foreground/90"
        >
          Sign In
          <span aria-hidden>→</span>
        </Link>
      </div>
    );
  }

  // ── Logged in but not verified ─────────────────────────────────────────────
  if (!isVerified) {
    return (
      <div className="mt-8 relative flex items-start gap-3 border border-amber-400/15 bg-amber-400/5 p-5">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-amber-400/30 to-transparent" />
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/60" />
        <div>
          <p className="font-tech text-[10px] uppercase tracking-wider text-amber-400/80">
            Verification Required
          </p>
          <p className="mt-1 text-sm leading-snug text-white/40">
            Server access is exclusive to verified Black Rose members. Complete verification via our
            Discord to unlock connection details.
          </p>
        </div>
      </div>
    );
  }

  // ── Verified ────────────────────────────────────────────────────────────
  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => void handleReveal()}
        disabled={isLoading}
        className="clip-cta group inline-flex h-12 items-center gap-3 bg-foreground px-8 font-tech text-sm uppercase tracking-wider-2 text-background transition hover:bg-foreground/90 disabled:opacity-50 disabled:pointer-events-none"
      >
        {isLoading ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/30 border-t-background" />
            Fetching details…
          </>
        ) : (
          <>
            Join Server
            <span aria-hidden className="text-base leading-none">
              →
            </span>
          </>
        )}
      </button>
      {error && (
        <p className="mt-3 font-tech text-[10px] uppercase tracking-wider text-red-400/80">
          {error}
        </p>
      )}

      {showModal && joinInfo && (
        <JoinServerModal joinInfo={joinInfo} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function ServerDetailSkeleton() {
  return (
    <>
      {/* Hero skeleton */}
      <section className="relative overflow-hidden border-b border-white/6 site-header-offset-hero pb-20">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
        <div className="relative mx-auto max-w-7xl px-6">
          <Skeleton className="mb-6 h-4 w-28 rounded-none bg-white/5" />
          <Skeleton className="mb-3 h-4 w-40 rounded-none bg-white/5" />
          <Skeleton className="h-14 w-96 rounded-none bg-white/5" />
          <Skeleton className="mt-4 h-7 w-24 rounded-none bg-white/5" />
        </div>
      </section>

      {/* Main skeleton */}
      <main className="relative bg-[oklch(0.05_0_0)]">
        <div className="relative mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div className="clip-angle-lg border border-white/8 bg-[oklch(0.055_0_0)] p-6">
              <Skeleton className="mb-6 h-3 w-24 rounded-none bg-white/5" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="mb-2 h-3 w-14 rounded-none bg-white/5" />
                    <Skeleton className="h-7 w-10 rounded-none bg-white/5" />
                  </div>
                ))}
              </div>
            </div>
            <div className="clip-angle-lg border border-white/8 bg-[oklch(0.055_0_0)] p-6">
              <Skeleton className="mb-6 h-3 w-28 rounded-none bg-white/5" />
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="mb-3 h-8 w-full rounded-none bg-white/5" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Offline banner — shown above the panels when server is down
// ---------------------------------------------------------------------------

function ServerOfflineBanner({ serverName }: { serverName: string }) {
  return (
    <div className="relative mb-8 flex items-start gap-4 border border-white/8 bg-white/2 px-5 py-4">
      {/* Left accent line */}
      <div className="absolute inset-y-0 left-0 w-px bg-white/20" />

      <div className="min-w-0 flex-1">
        <p className="font-tech text-[10px] uppercase tracking-wider text-white/40">
          Server Offline
        </p>
        <p className="mt-0.5 font-tech text-sm uppercase tracking-[0.06em] text-white/60">
          <span className="text-white">{serverName}</span> is currently unreachable. Stats will
          populate once the server comes back online.
        </p>
      </div>

      {/* Pulse indicator */}
      <div className="mt-1 flex shrink-0 items-center gap-1.5 font-tech text-[10px] uppercase tracking-wider text-white/25">
        <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
        Opening Soon
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// World Stats panel
// ---------------------------------------------------------------------------

function WorldStatsPanel({ server }: { server: PalworldServerDetail }) {
  const playerPct =
    server.maxPlayers > 0
      ? Math.min(100, Math.round((server.currentPlayers / server.maxPlayers) * 100))
      : 0;

  const basecampDisplay = (() => {
    if (!server.online) return "—";
    if (server.maxBasecampNum > 0) return `${server.basecampNum} / ${server.maxBasecampNum}`;
    return String(server.basecampNum);
  })();

  const stats = [
    {
      label: "Players Online",
      value: server.online ? `${server.currentPlayers} / ${server.maxPlayers}` : "—",
    },
    { label: "World Day", value: server.online ? `Day ${server.days}` : "—" },
    { label: "Uptime", value: server.online ? formatUptime(server.uptime) : "—" },
    {
      label: "Server FPS",
      value: server.online && server.serverFps > 0 ? `${server.serverFps} fps` : "—",
    },
    {
      label: "Frame Time",
      value:
        server.online && server.serverFrameTime > 0
          ? `${server.serverFrameTime.toFixed(2)} ms`
          : "—",
    },
    { label: "Active Palbox", value: basecampDisplay },
    {
      label: "Base Pals",
      value: server.online && server.maxBasePals > 0 ? `max ${server.maxBasePals}` : "—",
    },
    { label: "Version", value: server.version || "—" },
  ];

  return (
    <div className="clip-angle-lg relative flex flex-col border border-white/[0.07] bg-[oklch(0.055_0_0)] p-6">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.15]" />

      <div className="relative mb-5 font-tech text-label-readable uppercase text-muted-foreground">
        World Stats
      </div>

      {/* Stat grid — 2 cols on mobile, 3 on sm+ so each cell isn't too narrow */}
      <dl className="relative grid grid-cols-2 divide-x divide-white/8 border border-white/8 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="p-3 sm:p-4">
            <dt className="font-tech text-label-readable uppercase text-muted-foreground">
              {s.label}
            </dt>
            <dd className="mt-1 font-display text-lg tracking-[0.06em] text-white sm:text-xl">
              {s.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* Player capacity bar */}
      {server.online && server.maxPlayers > 0 && (
        <div className="relative mt-5">
          <div className="mb-1.5 flex items-center justify-between font-tech text-label-readable uppercase text-muted-foreground">
            <span>Capacity</span>
            <span className={playerPct >= 100 ? "text-white" : "text-white/50"}>
              {playerPct >= 100 ? "Full" : `${playerPct}%`}
            </span>
          </div>
          <div className="h-px w-full bg-white/10">
            <div
              className={`h-px transition-all duration-700 ${
                playerPct >= 100
                  ? "bg-white"
                  : playerPct >= 70
                    ? "bg-amber-300/90"
                    : "bg-emerald-400/80"
              }`}
              style={{ width: `${playerPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Server Settings panel
// ---------------------------------------------------------------------------

function ServerSettingsPanel({
  settings,
  online,
}: {
  settings: Partial<PalworldServerSettings> | null;
  online: boolean;
}) {
  const s = settings;

  return (
    <div className="clip-angle-lg relative flex flex-col border border-white/[0.07] bg-[oklch(0.055_0_0)] p-6">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.15]" />

      <div className="relative mb-5 font-tech text-label-readable uppercase text-muted-foreground">
        Server Settings
      </div>

      {!online || !s ? (
        <p className="font-tech text-[10px] uppercase tracking-wider text-white/20">
          Settings unavailable while server is offline.
        </p>
      ) : (
        <div className="relative flex flex-col gap-6">
          {/* Gameplay Rates */}
          <div>
            <div className="mb-2 font-tech text-[10px] uppercase tracking-wider text-white/30">
              Gameplay Rates
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <SettingRow label="Experience Rate" value={formatMultiplier(s.ExpRate)} />
              <SettingRow label="Pal Capture Rate" value={formatMultiplier(s.PalCaptureRate)} />
              <SettingRow label="Pal Attack" value={formatMultiplier(s.PalDamageRateAttack)} />
              <SettingRow label="Pal Defense" value={formatMultiplier(s.PalDamageRateDefense)} />
              <SettingRow
                label="Player Attack"
                value={formatMultiplier(s.PlayerDamageRateAttack)}
              />
              <SettingRow
                label="Player Defense"
                value={formatMultiplier(s.PlayerDamageRateDefense)}
              />
              <SettingRow
                label="Collection Drop Rate"
                value={formatMultiplier(s.CollectionDropRate)}
              />
              <SettingRow label="Enemy Drop Rate" value={formatMultiplier(s.EnemyDropItemRate)} />
              <SettingRow label="Work Speed" value={formatMultiplier(s.WorkSpeedRate)} />
              <SettingRow label="Day Speed" value={formatMultiplier(s.DayTimeSpeedRate)} />
              <SettingRow label="Night Speed" value={formatMultiplier(s.NightTimeSpeedRate)} />
            </div>
          </div>

          {/* World Rules */}
          <div>
            <div className="mb-2 font-tech text-[10px] uppercase tracking-wider text-white/30">
              World Rules
            </div>
            <SettingRow label="Death Penalty" value={formatString(s.DeathPenalty)} />
            <SettingRow label="PvP" value={formatBool(s.bEnablePlayerToPlayerDamage)} />
            <SettingRow label="Friendly Fire" value={formatBool(s.bEnableFriendlyFire)} />
            <SettingRow label="Invader Enemies" value={formatBool(s.bEnableInvaderEnemy)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active Players panel
// ---------------------------------------------------------------------------

/** Platform label derived from the userId prefix */
function platformLabel(userId: string): string {
  if (userId.startsWith("steam_")) return "Steam";
  if (userId.startsWith("xbox_")) return "Xbox";
  if (userId.startsWith("ps5_")) return "PS5";
  if (userId.startsWith("mac_")) return "Mac";
  return "PC";
}

function PlayerRow({ player, rank }: { player: PalworldPlayer; rank: number }) {
  return (
    <div className="group flex items-center gap-4 border-b border-white/[0.06] px-5 py-3 transition-colors hover:bg-white/[0.03]">
      {/* Rank */}
      <span className="w-6 shrink-0 text-right font-tech text-[10px] uppercase text-white/25">
        {String(rank).padStart(2, "0")}
      </span>

      {/* Name + platform */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-tech text-sm uppercase tracking-[0.06em] text-white/85 group-hover:text-white transition-colors">
          {player.name || player.accountName || "—"}
        </p>
        <p className="mt-0.5 font-tech text-[9px] uppercase tracking-wider text-white/25">
          {platformLabel(player.userId)}
        </p>
      </div>

      {/* Level */}
      <div className="shrink-0 text-right">
        <p className="font-tech text-[9px] uppercase tracking-wider text-white/30">Lv</p>
        <p className="font-display text-lg tracking-[0.06em] text-white leading-none">
          {player.level > 0 ? player.level : "—"}
        </p>
      </div>

      {/* Ping */}
      <div className="shrink-0 text-right">
        <p className="font-tech text-[9px] uppercase tracking-wider text-white/30">Ping</p>
        <p
          className={`font-tech text-sm leading-none ${
            player.ping < 80
              ? "text-emerald-400"
              : player.ping < 150
                ? "text-amber-300/90"
                : "text-red-400/80"
          }`}
        >
          {player.ping > 0 ? `${Math.round(player.ping)}ms` : "—"}
        </p>
      </div>
    </div>
  );
}

function ActivePlayersPanel({
  serverId,
  online,
  memberId,
}: {
  serverId: string;
  online: boolean;
  memberId: string | undefined;
}) {
  const session = useMemberSession();
  const { players, isLoading, lastUpdated, refetch } = usePalworldPlayers(serverId, memberId);

  // ── Unauthenticated — show sign-in prompt ─────────────────────────────────
  if (!session) {
    return (
      <div className="clip-angle-lg relative flex flex-col border border-white/[0.07] bg-[oklch(0.055_0_0)]">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.15]" />
        <div className="relative flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
          <Lock className="h-7 w-7 text-white/15" />
          <div>
            <p className="font-tech text-[10px] uppercase tracking-wider text-white/40">
              Members Only
            </p>
            <p className="mt-1 text-sm text-white/30">
              Sign in to view who's currently playing on this server.
            </p>
          </div>
          <Link
            to="/login"
            search={{ redirect_to: `/servers/${serverId}` }}
            className="mt-1 clip-cta inline-flex h-9 items-center gap-2 bg-foreground px-5 font-tech text-[10px] uppercase tracking-wider text-background transition hover:bg-foreground/90"
          >
            Sign In →
          </Link>
        </div>
      </div>
    );
  }

  // ── Authenticated but not verified — no login redirect ────────────────────
  if (!memberId) {
    return (
      <div className="clip-angle-lg relative flex flex-col border border-amber-400/15 bg-amber-400/3">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.10]" />
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-amber-400/30 to-transparent" />
        <div className="relative flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
          <Lock className="h-7 w-7 text-amber-400/40" />
          <div>
            <p className="font-tech text-[10px] uppercase tracking-wider text-amber-400/70">
              Verification Required
            </p>
            <p className="mt-1 text-sm text-white/30">
              Complete verification on Discord to view the active player list.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!online) {
    return (
      <div className="clip-angle-lg relative flex flex-col items-center justify-center border border-white/[0.07] bg-[oklch(0.055_0_0)] py-16 text-center">
        <Users className="mb-3 h-8 w-8 text-white/15" />
        <p className="font-tech text-[10px] uppercase tracking-wider text-white/30">
          No players — server is offline
        </p>
      </div>
    );
  }

  return (
    <div className="clip-angle-lg relative flex flex-col border border-white/[0.07] bg-[oklch(0.055_0_0)]">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.15]" />

      {/* Panel header */}
      <div className="relative flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
        <div className="flex items-center gap-3">
          <Users className="h-4 w-4 text-white/40" />
          <span className="font-tech text-label-readable uppercase text-muted-foreground">
            Active Players
          </span>
          {!isLoading && (
            <span className="border border-white/8 bg-white/4 px-1.5 py-0.5 font-tech text-[9px] uppercase tracking-wider text-white/40">
              {players.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <p className="hidden font-tech text-[9px] uppercase tracking-wider text-white/20 sm:block">
              {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isLoading}
            className="font-tech text-[9px] uppercase tracking-wider text-white/30 transition hover:text-white/70 disabled:pointer-events-none disabled:opacity-40"
          >
            {isLoading ? "Loading…" : "↺ Refresh"}
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div className="relative flex items-center gap-4 border-b border-white/[0.05] bg-white/[0.02] px-5 py-2">
        <span className="w-6 shrink-0" />
        <span className="flex-1 font-tech text-[9px] uppercase tracking-wider text-white/25">
          Player
        </span>
        <span className="shrink-0 w-12 text-right font-tech text-[9px] uppercase tracking-wider text-white/25">
          Level
        </span>
        <span className="shrink-0 w-16 text-right font-tech text-[9px] uppercase tracking-wider text-white/25">
          Ping
        </span>
      </div>

      {/* Rows */}
      <div className="relative">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-3">
              <Skeleton className="h-3 w-5 rounded-none bg-white/5" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32 rounded-none bg-white/5" />
                <Skeleton className="h-2 w-12 rounded-none bg-white/[0.04]" />
              </div>
              <Skeleton className="h-5 w-8 rounded-none bg-white/5" />
            </div>
          ))
        ) : players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-2 h-6 w-6 text-white/15" />
            <p className="font-tech text-[10px] uppercase tracking-wider text-white/25">
              No players online right now
            </p>
          </div>
        ) : (
          players.map((player, i) => (
            <PlayerRow key={player.playerId || player.userId || i} player={player} rank={i + 1} />
          ))
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function ServerDetailPage() {
  const { id } = Route.useParams();
  const { server, isLoading, error } = usePalworldServerDetail(id);
  const session = useMemberSession();
  const memberId = session && hasFullMemberAccess(session.role) ? session.id : undefined;
  const [activeTab, setActiveTab] = useState<"overview" | "players">("overview");

  const serverNum = id.replace("server-", "");
  const displayName = server?.fullName ?? id.replace("server-", "Server ");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {isLoading ? (
        <ServerDetailSkeleton />
      ) : error ? (
        <>
          <section className="site-header-offset-hero pb-20" />
          <main className="relative bg-[oklch(0.05_0_0)]">
            <div className="relative mx-auto max-w-7xl px-6 py-24 text-center">
              <p className="font-tech text-label-readable uppercase text-muted-foreground">
                {error}
              </p>
            </div>
          </main>
        </>
      ) : (
        <>
          {/* ── Hero ───────────────────────────────────────── */}
          <section className="relative overflow-hidden border-b border-white/6 site-header-offset-hero pb-20">
            <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />

            {/* Palworld icon — top-right decoration */}
            <div className="pointer-events-none absolute right-8 top-8 opacity-10 md:right-16 md:top-12">
              <PalworldIcon className="h-24 w-24 object-contain md:h-32 md:w-32" />
            </div>

            <div className="relative mx-auto max-w-7xl px-6">
              {/* Back link */}
              <Link
                to="/servers"
                className="mb-6 inline-flex items-center gap-2 font-tech text-label-readable uppercase text-muted-foreground transition hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                All Servers
              </Link>

              {/* Eyebrow */}
              <div className="mt-4 mb-2 inline-flex items-center gap-3 font-tech text-label-readable uppercase text-muted-foreground">
                <span className="h-px w-10 bg-border" />
                Palworld · Server {serverNum} · Community Gaming
              </div>

              {/* Server name */}
              <h1 className="font-display text-5xl tracking-display sm:text-6xl">{displayName}</h1>

              {/* Status badge + Join button */}
              <div className="mt-4 flex flex-wrap items-start gap-4">
                <StatusBadge online={server?.online ?? false} />
              </div>

              {/* Join server panel */}
              <JoinServerPanel serverId={id} />
            </div>
          </section>

          {/* ── Main content ───────────────────────────────── */}
          <main className="relative bg-[oklch(0.05_0_0)]">
            <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

            {/* ── Tab bar ────────────────────────────────────── */}
            <div className="relative border-b border-white/[0.07] bg-[oklch(0.055_0_0)]">
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
              <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
                  {(
                    [
                      { key: "overview", label: "Overview" },
                      {
                        key: "players",
                        label: "Active Players",
                        icon: <Users className="h-3 w-3" />,
                        badge: server?.online ? String(server.currentPlayers) : null,
                      },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 font-tech text-[11px] uppercase tracking-widest transition-all duration-150 ${
                        activeTab === tab.key
                          ? "bg-white text-background"
                          : "text-white/45 hover:bg-white/8 hover:text-white/75"
                      }`}
                    >
                      {"icon" in tab && tab.icon}
                      {tab.label}
                      {"badge" in tab && tab.badge !== null && (
                        <span
                          className={`rounded-sm px-1.5 py-0.5 font-tech text-[8px] uppercase ${
                            activeTab === tab.key
                              ? "bg-black/15 text-background/70"
                              : "bg-white/8 text-white/30"
                          }`}
                        >
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative mx-auto max-w-7xl px-6 py-10">
              {server && !server.online && activeTab === "overview" && (
                <ServerOfflineBanner serverName={server.name} />
              )}

              {activeTab === "overview" && server && (
                <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
                  <WorldStatsPanel server={server} />
                  <ServerSettingsPanel settings={server.settings} online={server.online} />
                </div>
              )}

              {activeTab === "players" && (
                <ActivePlayersPanel
                  serverId={id}
                  online={server?.online ?? false}
                  memberId={memberId}
                />
              )}
            </div>
          </main>
        </>
      )}

      <Footer />
    </div>
  );
}
