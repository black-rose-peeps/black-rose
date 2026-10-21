import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useActiveGames } from "@/features/admin/features/games/hooks/useGames";
import { Header } from "@/features/landing/components/Header";
import { Footer } from "@/features/landing/components/Footer";

/** Unmount game content (including polling and join controls) when it is unavailable. */
export function ActivePalworldBoundary({ children }: { children: ReactNode }) {
  const { data: games, isLoading, isError, refetch } = useActiveGames();
  const available =
    !isLoading && !isError && games?.some((game) => game.is_active && game.slug === "palworld");

  if (available) return children;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="site-header-offset-hero mx-auto min-h-[60vh] max-w-3xl px-6 pb-20">
        <h1 className="font-display text-4xl tracking-display">Game Servers</h1>
        <p role={isError ? "alert" : "status"} className="mt-4 text-muted-foreground">
          {isLoading
            ? "Loading available games…"
            : isError
              ? "Unable to load available games. Please try again."
              : "Game servers are currently unavailable."}
        </p>
        {isError && (
          <button type="button" className="mt-4 underline" onClick={() => void refetch()}>
            Retry
          </button>
        )}
        <Link to="/community" className="mt-6 inline-block underline">
          Back to community
        </Link>
      </main>
      <Footer />
    </div>
  );
}
