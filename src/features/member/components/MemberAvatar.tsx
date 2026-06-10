import { cn } from "@/lib/utils";

interface MemberAvatarProps {
  avatarUrl: string | null;
  initials: string;
  name?: string;
  className?: string;
}

export function MemberAvatar({ avatarUrl, initials, name, className }: MemberAvatarProps) {
  const altText = name ? `${name} avatar` : "Member avatar";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={altText}
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
