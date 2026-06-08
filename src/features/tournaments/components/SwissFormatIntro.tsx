interface SwissFormatIntroProps {
  winsToAdvance: number;
  lossesToEliminate: number;
  className?: string;
}

export function SwissFormatIntro({
  winsToAdvance,
  lossesToEliminate,
  className,
}: SwissFormatIntroProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        <span className="h-px w-8 bg-border" />
        Swiss System
        <span className="h-px flex-1 bg-border" />
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Teams are paired by record each round. First to{" "}
        <span className="text-foreground">{winsToAdvance} wins</span> advances to playoffs;{" "}
        <span className="text-foreground">{lossesToEliminate} losses</span> eliminates. After the
        group stage, a championship bracket decides final placements.
      </p>
    </div>
  );
}
