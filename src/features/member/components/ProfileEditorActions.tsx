import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileEditorActionsProps {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  initialized: boolean;
  error: string | null;
  onDiscard: () => void;
}

/** One save boundary for every profile section; errors never disappear with a tab. */
export function ProfileEditorActions({
  dirty,
  saving,
  saved,
  initialized,
  error,
  onDiscard,
}: ProfileEditorActionsProps) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-8 flex flex-wrap items-center gap-3 border border-white/15 bg-background/95 px-4 py-3 backdrop-blur-md safe-bottom sm:mx-0 sm:px-5 sm:py-4">
      <div className="mr-auto w-full sm:w-auto">
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="flex items-center gap-2 text-sm"
        >
          {saved && !dirty && <CheckCircle className="h-4 w-4" aria-hidden />}
          {saving
            ? "Saving changes…"
            : error
              ? "Changes not saved"
              : dirty
                ? "Unsaved changes"
                : saved
                  ? "Changes saved"
                  : "No unsaved changes"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Save applies to every section.</p>
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={!dirty || saving || !initialized}
        onClick={onDiscard}
        className="h-11 min-w-0 flex-1 rounded-none border-white/15 font-tech sm:flex-none"
      >
        Discard changes
      </Button>
      <Button
        type="submit"
        disabled={saving || !initialized || !dirty}
        className="clip-cta h-11 min-w-0 flex-1 rounded-none bg-white px-5 font-tech text-ui-readable uppercase text-black hover:bg-white/90 sm:flex-none sm:px-8"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {saving ? "Saving…" : "Save changes"}
      </Button>
      {error && (
        <p role="alert" className="w-full text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
