import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/features/landing/components/Header";
import { Hero } from "@/features/landing/components/Hero";
import { FeaturedTournaments } from "@/features/landing/components/FeaturedTournaments";
import { WhyBlackRose } from "@/features/landing/components/WhyBlackRose";
import { HallOfChampions } from "@/features/landing/components/HallOfChampions";
import { CtaBand } from "@/features/landing/components/CtaBand";
import { Footer } from "@/features/landing/components/Footer";

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
  const hash = useRouterState({ select: (s) => s.location.hash });

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" });
  }, [hash]);

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
