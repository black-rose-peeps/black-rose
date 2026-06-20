interface LowerBracketPlayInGuideProps {
  teamCount?: number;
}

export function LowerBracketPlayInGuide({ teamCount }: LowerBracketPlayInGuideProps) {
  return (
    <div className="border border-amber-400/20 bg-amber-400/5 px-4 py-3">
      <p className="font-tech text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/90">
        Lower Bracket — Round 1
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {teamCount ? (
          <>
            With <span className="text-foreground/90">{teamCount} teams</span>, opening play-in
            losers drop into <span className="text-foreground/90">Lower Round 1</span> and wait for
            an upper Round 2 loser in the same match — they do not face each other immediately
            (Challonge-style crossover).
          </>
        ) : (
          <>
            Opening play-in losers drop into <span className="text-foreground/90">Lower Round 1</span>{" "}
            and wait for an upper Round 2 loser in the same slot.
          </>
        )}
      </p>
    </div>
  );
}
