interface LowerBracketPlayInGuideProps {
  teamCount?: number;
}

export function LowerBracketPlayInGuide({ teamCount }: LowerBracketPlayInGuideProps) {
  return (
    <div className="border border-amber-400/20 bg-amber-400/5 px-4 py-3">
      <p className="font-tech text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300/90">
        Lower Bracket — Play-in Field
      </p>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {teamCount ? (
          <>
            With <span className="text-foreground/90">{teamCount} teams</span>, the main bracket runs as
            an 8-team field. Opening play-in losers drop into{" "}
            <span className="text-foreground/90">Lower Play-in</span>, then meet{" "}
            <span className="text-foreground/90">Lower Round 1</span> survivors in{" "}
            <span className="text-foreground/90">Crossover</span> before the lower bracket continues.
          </>
        ) : (
          <>
            Opening play-in losers drop into <span className="text-foreground/90">Lower Play-in</span>,
            then meet <span className="text-foreground/90">Lower Round 1</span> survivors in{" "}
            <span className="text-foreground/90">Crossover</span> before the lower bracket continues.
          </>
        )}{" "}
        When a path skips a column, the dashed connector shows a carry-forward — this is normal for
        10, 12, and 14 team fields.
      </p>
    </div>
  );
}
