import { DiscordIcon } from "@/features/shared/components/DiscordIcon";

interface DiscordButtonProps {
  onClick: () => void;
  label?: string;
}

/** Full-width Discord OAuth button — used on login and register pages. */
export function DiscordButton({ onClick, label = "Continue with Discord" }: DiscordButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer group relative inline-flex h-14 w-full items-center justify-center gap-3 bg-[#5865F2] px-6 font-tech text-sm uppercase tracking-wider-2 text-white transition hover:bg-[#4752c4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5865F2]"
    >
      <DiscordIcon className="h-5 w-5 shrink-0" />
      {label}
    </button>
  );
}
