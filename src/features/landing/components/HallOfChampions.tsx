"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SectionHeading } from "./SectionHeading";

interface Champion {
  id: string;
  tournament_id: string;
  tournament_name: string;
  team_name: string;
  team_tag: string;
  mvp: string | null;
  completed_at: string | null;
  created_at: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function HallOfChampions() {
  const [champs, setChamps] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChampions() {
      const { data, error } = await supabase
        .from("tournament_champions")
        .select("*")
        .order("completed_at", { ascending: false });

      if (!error && data) {
        setChamps(data);
      }
      setLoading(false);
    }

    fetchChampions();
  }, []);

  return (
    <section
      id="champions"
      className="relative border-t border-white/[0.06] bg-background py-24 md:py-32 overflow-hidden scroll-mt-16"
    >
      {/* Subtle diagonal line texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.5) 0px, rgba(255,255,255,0.5) 1px, transparent 1px, transparent 60px)",
        }}
      />
      {/* Top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,255,255,0.04),transparent)]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <SectionHeading
          eyebrow="03 — Legacy"
          title="Hall of Champions"
          description="Teams that carved their name into the Black Rose archive."
        />

        {loading ? (
          <div className="border-y border-white/[0.06] py-16 text-center font-tech text-xs uppercase tracking-wider-2 text-muted-foreground">
            Loading champions...
          </div>
        ) : champs.length === 0 ? (
          <div className="border-y border-white/[0.06] py-16 text-center font-tech text-xs uppercase tracking-wider-2 text-muted-foreground">
            No champions yet. Be the first.
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
            {champs.map((c, i) => (
              <li
                key={c.id}
                className="group relative grid grid-cols-12 items-center gap-4 py-6 transition duration-200 hover:bg-white/[0.025] md:py-8"
              >
                {/* Left accent on hover */}
                <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-linear-to-b from-transparent via-white/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="col-span-1 font-display text-xl tracking-display text-white/20 group-hover:text-white/50 transition-colors duration-200">
                  {String(i + 1).padStart(2, "0")}
                </div>

                <div className="col-span-11 flex items-center gap-4 md:col-span-4">
                  <div className="clip-tab grid h-12 w-12 shrink-0 place-items-center border border-white/10 bg-white/[0.05] font-display tracking-display text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] transition duration-200 group-hover:border-white/20 group-hover:bg-white/[0.08]">
                    {c.team_tag}
                  </div>
                  <div>
                    <div className="font-display text-xl tracking-display md:text-2xl">
                      {c.team_name}
                    </div>
                    <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                      Champion
                    </div>
                  </div>
                </div>

                <div className="col-span-6 md:col-span-4">
                  <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    Tournament
                  </div>
                  <div className="mt-1 text-sm">{c.tournament_name}</div>
                </div>

                <div className="col-span-3 md:col-span-2">
                  <div className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
                    MVP
                  </div>
                  <div className="mt-1 text-sm">{c.mvp ?? "—"}</div>
                </div>

                <div className="col-span-3 text-right text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground md:col-span-1">
                  {formatDate(c.completed_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
