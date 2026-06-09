import { cn } from "@/lib/utils";

interface MemberAvatarProps {
  avatarUrl: string | null;
  initials: string;
  className?: string;
}

export function MemberAvatar({ avatarUrl, initials, className }: MemberAvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={cn("border-2 border-white/20 object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "grid place-items-center border-2 border-white/20 bg-white/5 font-display tracking-display text-foreground",
        className,
      )}
    >
      {initials}
    </div>
  );
}
