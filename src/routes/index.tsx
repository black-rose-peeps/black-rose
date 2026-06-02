import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { FeaturedTournaments } from "@/components/site/FeaturedTournaments";
import { WhyBlackRose } from "@/components/site/WhyBlackRose";
import { HallOfChampions } from "@/components/site/HallOfChampions";
import { CtaBand } from "@/components/site/CtaBand";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Black Rose — Forge Your Legacy" },
      {
        name: "description",
        content:
          "Black Rose is a premium community esports tournament platform. Build teams, register for tournaments, and compete in professionally managed brackets.",
      },
      { property: "og:title", content: "Black Rose — Forge Your Legacy" },
      {
        property: "og:description",
        content:
          "Compete. Rise. Dominate. Community-driven esports tournaments hosted by Black Rose.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main>
        <Hero />
        <FeaturedTournaments />
        <WhyBlackRose />
        <HallOfChampions />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}
