import {
  AdaptiveAlertDialog,
  AdaptiveAlertDialogAction,
  AdaptiveAlertDialogCancel,
  AdaptiveAlertDialogContent,
  AdaptiveAlertDialogDescription,
  AdaptiveAlertDialogFooter,
  AdaptiveAlertDialogHeader,
  AdaptiveAlertDialogTitle,
} from "@/components/ui/adaptive-alert-dialog";

interface ConfirmDeleteDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  isDeleting = false,
  onClose,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <AdaptiveAlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !isDeleting) onClose();
      }}
    >
      <AdaptiveAlertDialogContent>
        <AdaptiveAlertDialogHeader>
          <AdaptiveAlertDialogTitle>{title}</AdaptiveAlertDialogTitle>
          <AdaptiveAlertDialogDescription>{description}</AdaptiveAlertDialogDescription>
        </AdaptiveAlertDialogHeader>
        <AdaptiveAlertDialogFooter>
          <AdaptiveAlertDialogCancel disabled={isDeleting}>Cancel</AdaptiveAlertDialogCancel>
          <AdaptiveAlertDialogAction
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {isDeleting ? "Deleting…" : confirmLabel}
          </AdaptiveAlertDialogAction>
        </AdaptiveAlertDialogFooter>
      </AdaptiveAlertDialogContent>
    </AdaptiveAlertDialog>
  );
}
