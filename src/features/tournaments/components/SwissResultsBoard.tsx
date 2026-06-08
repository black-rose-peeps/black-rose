import { Crown, Skull, Swords } from "lucide-react";
import {
  TournamentResultsBoard,
  type TournamentResultsEntry,
} from "./TournamentResultsBoard";

export type SwissResultsEntry = TournamentResultsEntry & {
  record: { wins: number; losses: number };
  prize?: string;
  placementLabel?: string;
};

export interface SwissResultsBoardProps {
  variant?: "admin" | "public";
  advanced: SwissResultsEntry[];
  eliminated: SwissResultsEntry[];
  active?: SwissResultsEntry[];
  className?: string;
}

export function SwissResultsBoard({
  variant = "public",
  advanced,
  eliminated,
  active = [],
  className,
}: SwissResultsBoardProps) {
  const qualifiedTitle = variant === "public" ? "Playoffs" : "Advanced";
  const qualifiedSubtitle = variant === "public" ? "Qualified" : "Playoff bound";
  const activeTitle = variant === "public" ? "In Contention" : "Still Active";
  const activeSubtitle = variant === "public" ? "Live bracket" : "Awaiting result";

  const sections = [
    {
      title: qualifiedTitle,
      subtitle: qualifiedSubtitle,
      count: advanced.length,
      entries: advanced,
      emptyLabel: variant === "public" ? "No teams qualified yet." : "No teams advanced yet.",
      tone: "qualified" as const,
      icon: <Crown className="h-4 w-4" strokeWidth={1.5} />,
    },
    {
      title: "Eliminated",
      subtitle: "Out of contention",
      count: eliminated.length,
      entries: eliminated,
      emptyLabel: "No eliminations yet.",
      tone: "eliminated" as const,
      icon: <Skull className="h-4 w-4" strokeWidth={1.5} />,
    },
  ];

  if (active.length > 0) {
    sections.push({
      title: activeTitle,
      subtitle: activeSubtitle,
      count: active.length,
      entries: active,
      emptyLabel: "",
      tone: "active" as const,
      icon: <Swords className="h-4 w-4" strokeWidth={1.5} />,
    });
  }

  return (
    <TournamentResultsBoard
      className={className}
      eyebrow="Swiss — Final standings"
      sections={sections}
    />
  );
}
