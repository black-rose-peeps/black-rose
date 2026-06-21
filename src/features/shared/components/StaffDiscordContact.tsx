import {
  BLACK_ROSE_STAFF_CONTACT_DETAIL,
  BLACK_ROSE_STAFF_CONTACT_SUMMARY,
  DISCORD_SERVER_INVITE,
} from "@/features/auth/constants";
import { cn } from "@/lib/utils";

interface StaffDiscordContactProps {
  variant?: "inline" | "block";
  className?: string;
}

export function StaffDiscordContact({ variant = "block", className }: StaffDiscordContactProps) {
  if (variant === "inline") {
    return (
      <a
        href={DISCORD_SERVER_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "text-sm text-white/85 underline decoration-white/25 underline-offset-4 transition hover:text-white hover:decoration-white/50",
          className,
        )}
      >
        {BLACK_ROSE_STAFF_CONTACT_SUMMARY}
      </a>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <a
        href={DISCORD_SERVER_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex text-sm font-medium text-white/90 underline decoration-white/25 underline-offset-4 transition hover:text-white hover:decoration-white/50"
      >
        {BLACK_ROSE_STAFF_CONTACT_SUMMARY}
      </a>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {BLACK_ROSE_STAFF_CONTACT_DETAIL}
      </p>
    </div>
  );
}
