import { cn } from "@/lib/utils";

interface MemberNameStackProps {
  displayName: string;
  discordUsername: string;
  size?: "xs" | "sm" | "md";
  showYou?: boolean;
  className?: string;
}

function formatDiscordHandle(value: string): string {
  const trimmed = value.trim().replace(/^@/, "");
  return trimmed ? `@${trimmed}` : "";
}

export function MemberNameStack({
  displayName,
  discordUsername,
  size = "sm",
  showYou = false,
  className,
}: MemberNameStackProps) {
  const discordLabel = formatDiscordHandle(discordUsername);

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          className={cn(
            "truncate font-medium",
            size === "md" && "text-sm",
            size === "sm" && "text-sm",
            size === "xs" && "text-xs",
          )}
        >
          {displayName}
        </span>
      </div>
      {discordLabel && (
        <p className="truncate font-tech text-label-readable uppercase text-muted-foreground">
          {discordLabel}
        </p>
      )}
      {showYou && (
        <span className="font-tech text-label-readable uppercase text-muted-foreground/50">
          you
        </span>
      )}
    </div>
  );
}
