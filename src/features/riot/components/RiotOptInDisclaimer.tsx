import { cn } from "@/lib/utils";

interface RiotOptInDisclaimerProps {
  className?: string;
  compact?: boolean;
  hideTitle?: boolean;
}

export function RiotOptInDisclaimer({
  className,
  compact = false,
  hideTitle = false,
}: RiotOptInDisclaimerProps) {
  return (
    <div
      className={cn(
        "border border-amber-400/20 bg-amber-400/5 text-xs leading-relaxed text-muted-foreground",
        compact ? "p-3" : "p-4",
        className,
      )}
      role="note"
    >
      {!hideTitle && (
        <p className="font-tech text-[10px] uppercase tracking-wider-2 text-amber-300/90">
          Riot data opt-in
        </p>
      )}
      <p className={cn(hideTitle ? "mt-0" : compact ? "mt-2" : "mt-3")}>
        Linking your Riot account is optional and requires your explicit consent. By linking, you
        opt in to Black Rose accessing your Riot account identity and, when enabled, gameplay data
        associated with your account.
      </p>
      {!compact && (
        <p className="mt-2">
          If you choose to show your Riot ID publicly, other members may see your linked game name
          and tag on your profile. Players who have not opted in will not have their Riot data
          displayed through Black Rose.
        </p>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground/70">
        Black Rose is not affiliated with or endorsed by Riot Games. VALORANT and Riot Games are
        trademarks of Riot Games, Inc.
      </p>
    </div>
  );
}
