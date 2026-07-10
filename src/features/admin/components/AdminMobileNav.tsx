import { useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Emblem } from "@/features/shared/components/Emblem";
import { logoutAdminConsole } from "@/features/admin/auth/admin-session";
import { ADMIN_NAVIGATION, isAdminNavActive } from "@/features/admin/constants/admin-navigation";

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  function handleLogout() {
    setOpen(false);
    logoutAdminConsole();
    navigate({ to: "/login", search: { console: "1" } });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        aria-label="Open admin navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="clip-tab touch-target flex shrink-0 items-center justify-center border border-white/10 bg-white/5 text-muted-foreground transition hover:border-white/20 hover:text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={1.5} />
      </button>

      <SheetContent
        side="left"
        className="flex w-[min(100vw-2rem,20rem)] flex-col border-white/10 bg-[oklch(0.06_0_0)] p-0 safe-bottom sm:max-w-xs"
      >
        <SheetHeader className="safe-top border-b border-white/8 px-6 py-5 text-left">
          <div className="flex items-center gap-3">
            <Emblem className="h-8 w-8 shrink-0" />
            <div>
              <SheetTitle className="font-display text-lg tracking-display text-foreground">
                BLACK ROSE
              </SheetTitle>
              <p className="font-tech text-label-readable uppercase text-muted-foreground">
                Admin Console
              </p>
            </div>
          </div>
        </SheetHeader>

        <nav aria-label="Admin navigation" className="flex-1 overflow-y-auto py-2">
          <ul className="flex flex-col">
            {ADMIN_NAVIGATION.map((item) => {
              const active = isAdminNavActive(location.pathname, item.href, item.exact);
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex min-h-11 items-center gap-3 border-l-2 px-6 py-3 font-tech text-ui-readable uppercase transition hover:bg-white/5 ${
                      active
                        ? "border-white bg-white/5 text-foreground"
                        : "border-transparent text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/8 px-3 py-4 safe-bottom">
          <button
            type="button"
            onClick={handleLogout}
            className="touch-target flex w-full items-center gap-3 rounded-lg px-3 py-2 font-tech text-ui-readable uppercase text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
