import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, type LucideIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export type MobileNavItem = {
  label: string;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, unknown>;
  icon?: LucideIcon;
  active?: boolean;
};

export type MobileNavSection = {
  title?: string;
  items: MobileNavItem[];
};

interface HeaderMobileMenuProps {
  sections: MobileNavSection[];
}

export function HeaderMobileMenu({ sections }: HeaderMobileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="clip-tab flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/5 text-muted-foreground transition hover:border-white/20 hover:text-foreground md:hidden"
      >
        <Menu className="h-5 w-5" strokeWidth={1.5} />
      </button>

      <SheetContent
        side="right"
        className="w-[min(100vw-2rem,20rem)] border-white/10 bg-[oklch(0.06_0_0)] p-0 sm:max-w-xs"
      >
        <SheetHeader className="border-b border-white/8 px-6 py-5 text-left">
          <SheetTitle className="font-display text-xl tracking-display text-foreground">
            Navigate
          </SheetTitle>
        </SheetHeader>

        <nav aria-label="Mobile navigation" className="flex flex-col py-2">
          {sections.map((section, sectionIndex) => (
            <div key={section.title ?? sectionIndex}>
              {section.title ? (
                <p className="px-6 py-2 font-tech text-label-readable uppercase text-muted-foreground/60">
                  {section.title}
                </p>
              ) : null}
              <ul className="flex flex-col">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon;
                  return (
                    <li key={`${sectionIndex}-${itemIndex}-${item.label}`}>
                      <Link
                        to={item.to}
                        params={item.params}
                        search={item.search}
                        onClick={() => setOpen(false)}
                        className={`flex min-h-11 items-center gap-3 px-6 py-3 font-tech text-ui-readable uppercase transition hover:bg-white/5 ${
                          item.active ? "bg-white/5 text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} /> : null}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {sectionIndex < sections.length - 1 ? (
                <div className="my-2 border-t border-white/6" />
              ) : null}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
