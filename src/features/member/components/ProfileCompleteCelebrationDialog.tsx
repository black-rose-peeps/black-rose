import { Link } from "@tanstack/react-router";
import { CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import { CornerAccents } from "@/features/member/components/MemberShell";
import { cn } from "@/lib/utils";

interface ProfileCompleteCelebrationDialogProps {
  open: boolean;
  displayName: string;
  avatarUrl: string | null;
  avatarInitials: string;
  profileSlug: string;
  onDismiss: () => void;
}

export function ProfileCompleteCelebrationDialog({
  open,
  displayName,
  avatarUrl,
  avatarInitials,
  profileSlug,
  onDismiss,
}: ProfileCompleteCelebrationDialogProps) {
  function handleOpenChange(next: boolean) {
    if (!next) onDismiss();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden rounded-none border border-emerald-400/20 bg-[oklch(0.07_0_0)] p-0 shadow-[0_24px_64px_rgba(0,0,0,0.85)] sm:rounded-none">
        <div className="relative overflow-hidden px-6 pb-6 pt-8">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5 blur-2xl"
            aria-hidden
          />
          <CornerAccents className="border-emerald-400/30" />

          <DialogHeader className="relative space-y-4 text-left">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <MemberAvatar
                  avatarUrl={avatarUrl}
                  initials={avatarInitials}
                  name={displayName}
                  className={cn(
                    "h-16 w-16 text-lg",
                    "ring-2 ring-emerald-400/40 ring-offset-2 ring-offset-[oklch(0.07_0_0)]",
                  )}
                />
                <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center border border-emerald-400/30 bg-emerald-400/15 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <div className="min-w-0 pt-1">
                <p className="mb-1 font-tech text-label-readable uppercase tracking-wider text-emerald-400/90">
                  Profile complete
                </p>
                <DialogTitle className="font-display text-2xl leading-tight tracking-display text-foreground">
                  You&apos;re arena-ready
                </DialogTitle>
              </div>
            </div>

            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 text-foreground/90">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" aria-hidden />
                {displayName}
              </span>
              , your profile is fully set up. Captains can spot you in invite lists, teammates see
              your game info at a glance, and your public page is ready to share.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="relative mt-6 flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button
              asChild
              className="clip-cta h-11 w-full rounded-none border-emerald-400/25 bg-emerald-400/10 font-tech text-ui-readable uppercase text-emerald-100 hover:bg-emerald-400/15"
            >
              <Link
                to="/members/$slug"
                params={{ slug: profileSlug }}
                onClick={onDismiss}
              >
                View public profile
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10 w-full rounded-none font-tech text-label-readable uppercase text-muted-foreground hover:bg-white/5 hover:text-foreground"
              onClick={onDismiss}
            >
              Continue
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
