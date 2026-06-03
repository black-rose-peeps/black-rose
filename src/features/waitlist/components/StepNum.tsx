/** Step number badge used in the waitlist onboarding steps. */
export function StepNum({ n }: { n: string }) {
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-white/15 font-display text-sm tracking-display text-muted-foreground">
      {n}
    </span>
  );
}
