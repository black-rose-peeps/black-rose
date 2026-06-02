import { Bell, Search } from "lucide-react";

export function AdminTopbar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="sticky top-0 z-30 flex h-16 items-center justify-between gap-6 border-b border-border bg-background/80 px-6 backdrop-blur-md lg:px-10">
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          {subtitle ?? "Admin Console"}
        </span>
        <h1 className="truncate font-display text-2xl tracking-display">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden h-9 items-center gap-2 border border-border bg-secondary px-3 text-xs text-muted-foreground md:flex">
          <Search className="h-3.5 w-3.5" />
          <input
            placeholder="Search console…"
            className="w-44 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button className="grid h-9 w-9 place-items-center border border-border bg-secondary text-muted-foreground transition hover:text-foreground">
          <Bell className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3 border border-border bg-secondary px-3 py-1.5">
          <div className="grid h-7 w-7 place-items-center bg-foreground text-[10px] font-tech tracking-wider-2 text-background">
            BR
          </div>
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-xs font-medium">warden</span>
            <span className="text-[9px] font-tech uppercase tracking-wider-2 text-muted-foreground">
              Super Admin
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
