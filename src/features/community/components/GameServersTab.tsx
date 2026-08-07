import { GameCard } from "./GameCard";
import { CommunitySection } from "./CommunitySection";
import palworldBanner from "/palworld-banner.png";

export function GameServersTab() {
  return (
    <CommunitySection
      eyebrow="Community Gaming"
      heading="Dedicated Servers"
      description="Black Rose runs dedicated community game servers. Join a server, play with guild members, and be part of the action."
    >
      <GameCard
        title="Palworld"
        subtitle="Community · Dedicated Servers"
        description="Black Rose runs four dedicated Palworld servers open to verified members. Check live player counts, server stats, and connection details."
        tag="Palworld"
        bannerSrc={palworldBanner}
        bannerAlt="Palworld"
        ctaLabel="View Servers"
        ctaHref="/servers"
        accentLine="from-emerald-400/80 via-emerald-400/20 to-transparent"
        accentTag="border-emerald-400/35 text-emerald-200 bg-emerald-500/8"
      />
    </CommunitySection>
  );
}
