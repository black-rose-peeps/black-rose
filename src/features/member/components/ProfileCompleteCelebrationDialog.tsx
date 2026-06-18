import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import registrationGuideImg from "@/assets/Tournament-registration-process-instructions.png";
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
      <DialogContent className="custom-scrollbar max-h-[92vh] max-w-5xl gap-0 overflow-y-auto rounded-none border border-emerald-400/20 bg-[oklch(0.07_0_0)] p-0 shadow-[0_24px_64px_rgba(0,0,0,0.85)] sm:rounded-none">
        <div className="relative overflow-hidden px-5 pb-6 pt-6 sm:px-8 sm:pt-8">
          <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-400/10 blur-3xl"
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
                    "h-14 w-14 text-base",
                    "ring-2 ring-emerald-400/40 ring-offset-2 ring-offset-[oklch(0.07_0_0)]",
                  )}
                />
                <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center border border-emerald-400/30 bg-emerald-400/15 text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                </span>
              </div>
              <div className="min-w-0 pt-1">
                <p className="mb-1 font-tech text-label-readable uppercase tracking-wider text-emerald-400/90">
                  Profile complete
                </p>
                <DialogTitle className="font-display text-2xl leading-tight tracking-display text-foreground">
                  You&apos;re arena-ready, {displayName}
                </DialogTitle>
              </div>
            </div>

            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              Step 1 is done. Follow the guide below to create your team, register for a tournament,
              and get approved.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-5 clip-angle-lg overflow-hidden border border-white/10 bg-black">
            <img
              src={registrationGuideImg}
              alt="Tournament registration process: complete your website profile, create a team and invite members, browse and register your team, wait for admin approval, then your team appears on the tournament public page."
              className="h-auto w-full"
            />
          </div>

          <DialogFooter className="relative mt-6 flex-col gap-2 sm:flex-col sm:space-x-0">
            <Button
              asChild
              className="clip-cta h-11 w-full rounded-none border-emerald-400/25 bg-emerald-400/10 font-tech text-ui-readable uppercase text-emerald-100 hover:bg-emerald-400/15"
            >
              <Link to="/teams/create" onClick={onDismiss}>
                Create a team
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-11 w-full rounded-none border-white/15 bg-white/5 font-tech text-ui-readable uppercase hover:bg-white/10"
            >
              <Link to="/tournaments" onClick={onDismiss}>
                Browse tournaments
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              className="h-10 w-full rounded-none font-tech text-label-readable uppercase text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <Link to="/members/$slug" params={{ slug: profileSlug }} onClick={onDismiss}>
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
