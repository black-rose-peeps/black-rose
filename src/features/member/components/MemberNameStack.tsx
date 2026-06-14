import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface MemberNameStackProps {
  displayName: string;
  discordUsername: string;
  /** When set, the display name links to `/members/$slug`. */
  profileSlug?: string | null;
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
  profileSlug,
  size = "sm",
  showYou = false,
  className,
}: MemberNameStackProps) {
  const discordLabel = formatDiscordHandle(discordUsername);
  const slug = profileSlug?.trim();
  const nameClassName = cn(
    "truncate font-medium",
    size === "md" && "text-sm",
    size === "sm" && "text-sm",
    size === "xs" && "text-xs",
    slug && "transition hover:text-foreground hover:underline underline-offset-4",
  );

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex min-w-0 items-center gap-1.5">
        {slug ? (
          <Link to="/members/$slug" params={{ slug }} className={nameClassName}>
            {displayName}
          </Link>
        ) : (
          <span className={nameClassName}>{displayName}</span>
        )}
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
