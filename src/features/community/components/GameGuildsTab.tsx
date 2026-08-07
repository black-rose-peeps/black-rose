import { GameCard } from "./GameCard";
import { CommunitySection } from "./CommunitySection";
import wwmBanner from "@/assets/wwm-tournament-header.jpg";

export function GameGuildsTab() {
  return (
    <CommunitySection
      eyebrow="Community Gaming"
      heading="Game Guilds"
      description="Black Rose maintains in-game guilds across titles where the community plays together. Find your guild and apply to join."
    >
      <GameCard
        title="Where Winds Meet"
        subtitle="Community · In-Game Guilds"
        description="Four active Black Rose guilds in Where Winds Meet — Noir, Noctis, Enigma, and Umbra. Apply through the verification channel to join your guild."
        tag="WWM"
        bannerSrc={wwmBanner}
        bannerAlt="Where Winds Meet"
        ctaLabel="View Guilds"
        ctaHref="/guilds"
        accentLine="from-cyan-400/80 via-cyan-400/20 to-transparent"
        accentTag="border-cyan-400/35 text-cyan-100 bg-cyan-500/8"
      />
    </CommunitySection>
  );
}
