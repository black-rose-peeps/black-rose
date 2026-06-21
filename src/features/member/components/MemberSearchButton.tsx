import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { MemberSearchDialog } from "./MemberSearchDialog";

export function MemberSearchButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function isEditableTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      return Boolean(target.closest("[contenteditable='true']"));
    }

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search verified members"
        aria-haspopup="dialog"
        title="Search verified members"
        className="clip-tab touch-target flex cursor-pointer items-center justify-center border border-white/10 bg-white/4 text-muted-foreground transition hover:border-white/25 hover:bg-white/[0.07] hover:text-foreground"
      >
        <Search className="h-4 w-4" strokeWidth={1.5} />
      </button>
      <MemberSearchDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
