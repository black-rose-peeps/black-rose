import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";
import { Emblem } from "@/features/shared/components/Emblem";
import { OverviewTab } from "@/features/community/components/OverviewTab";
import { EventsTab } from "@/features/community/components/EventsTab";
import { GameServersTab } from "@/features/community/components/GameServersTab";
import { GameGuildsTab } from "@/features/community/components/GameGuildsTab";
import { TABS, type CommunityTab } from "@/features/community/components/CommunityTabs";

export const Route = createFileRoute("/community/")({
  head: () => ({
    meta: [
      { title: "Community — Black Rose" },
      {
        name: "description",
        content:
          "Meet the Black Rose guild. Our Guild Code of Values defines who we are — integrity, passion, and a community built to last.",
      },
    ],
  }),
  component: CommunityPage,
});

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function CommunityPage() {
  const [activeTab, setActiveTab] = useState<CommunityTab>("overview");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* ── Page hero ─────────────────────────────────────── */}
      <section className="relative overflow-hidden site-header-offset-hero pb-20">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-60" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(255,255,255,0.06),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/15 to-transparent" />
        <Emblem
          spin
          className="pointer-events-none absolute -right-20 top-0 h-128 w-lg opacity-[0.04]"
        />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-4 inline-flex items-center gap-3 font-tech text-label-readable uppercase text-muted-foreground">
            <span className="h-px w-10 bg-border" />
            The Guild
          </div>

          <h1 className="font-display text-5xl tracking-display sm:text-6xl md:text-7xl">
            Community
          </h1>

          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
            We act with honesty, integrity, and transparency — in leadership, gameplay, and
            community decisions. Trust and loyalty are our foundation.
          </p>
        </div>
      </section>

      {/* ── Tab bar ────────────────────────────────────────── */}
      <div className="sticky sticky-below-header z-30 border-b border-white/[0.07] bg-[oklch(0.055_0_0)] backdrop-blur-md">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
            {TABS.map((tab) => (
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
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────── */}
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "events" && <EventsTab />}
      {activeTab === "servers" && <GameServersTab />}
      {activeTab === "guilds" && <GameGuildsTab />}

      <Footer />
    </div>
  );
}
