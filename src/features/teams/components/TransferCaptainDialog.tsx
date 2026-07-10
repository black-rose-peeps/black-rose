import { Crown, Loader2 } from "lucide-react";
import {
  AdaptiveAlertDialog,
  AdaptiveAlertDialogCancel,
  AdaptiveAlertDialogContent,
  AdaptiveAlertDialogDescription,
  AdaptiveAlertDialogFooter,
  AdaptiveAlertDialogHeader,
  AdaptiveAlertDialogTitle,
} from "@/components/ui/adaptive-alert-dialog";
import { Button } from "@/components/ui/button";
import { MemberAvatar } from "@/features/member/components/MemberAvatar";
import { MemberNameStack } from "@/features/member/components/MemberNameStack";
import type { TeamMember } from "@/features/teams/types";

interface TransferCaptainDialogProps {
  open: boolean;
  member: TeamMember | null;
  teamName: string;
  teamTag: string;
  transferring?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function TransferCaptainDialog({
  open,
  member,
  teamName,
  teamTag,
  transferring = false,
  onClose,
  onConfirm,
}: TransferCaptainDialogProps) {
  return (
    <AdaptiveAlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !transferring) onClose();
      }}
    >
      <AdaptiveAlertDialogContent>
        <AdaptiveAlertDialogHeader>
          <AdaptiveAlertDialogTitle>Transfer captaincy?</AdaptiveAlertDialogTitle>
          <AdaptiveAlertDialogDescription asChild>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                You are about to make this member captain of{" "}
                <span className="text-foreground">
                  {teamName} [{teamTag}]
                </span>
                . You will remain on the roster as an active member, but lose captain controls such
                as invites, roster edits, and tournament registration.
              </p>
              {member ? (
                <div className="flex items-center gap-3 border border-white/10 bg-white/3 px-4 py-3">
                  <MemberAvatar
                    avatarUrl={member.avatarUrl}
                    initials={member.avatarInitials}
                    name={member.displayName}
                    className="h-10 w-10 shrink-0 text-sm"
                  />
                  <MemberNameStack
                    displayName={member.displayName}
                    discordUsername={member.discordUsername}
                    size="sm"
                    className="min-w-0"
                  />
                  <Crown className="ml-auto h-4 w-4 shrink-0 text-amber-300/80" />
                </div>
              ) : null}
            </div>
          </AdaptiveAlertDialogDescription>
        </AdaptiveAlertDialogHeader>
        <AdaptiveAlertDialogFooter>
          <AdaptiveAlertDialogCancel
            disabled={transferring}
            className="rounded-none border-white/15 bg-transparent font-tech text-ui-readable uppercase"
          >
            Cancel
          </AdaptiveAlertDialogCancel>
          <Button
            type="button"
            disabled={transferring || !member}
            onClick={onConfirm}
            className="clip-cta rounded-none bg-white font-tech text-ui-readable uppercase text-black hover:bg-white/90"
          >
            {transferring ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Transferring…
              </>
            ) : (
              <>
                <Crown className="h-4 w-4" />
                Make Captain
              </>
            )}
          </Button>
        </AdaptiveAlertDialogFooter>
      </AdaptiveAlertDialogContent>
    </AdaptiveAlertDialog>
  );
}
