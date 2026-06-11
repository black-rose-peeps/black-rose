import { cn } from "@/lib/utils";

interface ValorantNonAffiliationDisclaimerProps {
  className?: string;
}

export function ValorantNonAffiliationDisclaimer({
  className,
}: ValorantNonAffiliationDisclaimerProps) {
  return (
    <p
      className={cn(
        "border border-white/8 bg-white/[0.02] px-4 py-3 text-[11px] leading-relaxed text-muted-foreground",
        className,
      )}
      role="note"
    >
      This competition is not affiliated with or sponsored by Riot Games, Inc. or VALORANT Esports.
    </p>
  );
}
