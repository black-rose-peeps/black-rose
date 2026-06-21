"use client";

import { useState } from "react";
import type { HallOfChampionRecord } from "../types";
import { ChampionArchiveCard } from "./ChampionArchiveCard";
import { ChampionStoryDialog } from "./ChampionStoryDialog";

interface HallOfChampionsGridProps {
  champions: HallOfChampionRecord[];
  /** When set, only the first N champions are shown (landing sneak peek). */
  limit?: number;
}

export function HallOfChampionsGrid({ champions, limit }: HallOfChampionsGridProps) {
  const [selected, setSelected] = useState<HallOfChampionRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const visible = limit ? champions.slice(0, limit) : champions;

  function openChampion(champion: HallOfChampionRecord) {
    setSelected(champion);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
        {visible.map((champion, index) => (
          <ChampionArchiveCard
            key={champion.id}
            champion={champion}
            index={index}
            onSelect={openChampion}
          />
        ))}
      </div>

      <ChampionStoryDialog champion={selected} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
