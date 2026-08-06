import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "clip-cta group toast !bg-[oklch(0.08_0_0)] !text-foreground shadow-[0_8px_32px_rgba(0,0,0,0.6)]",
          description: "!text-muted-foreground",
          actionButton:
            "clip-cta border border-white/15 bg-white/4 font-tech text-[10px] uppercase tracking-wider text-white/60 transition hover:border-white/25 hover:bg-white/8 hover:text-white",
          cancelButton:
            "clip-cta border border-white/10 bg-white/2 font-tech text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-white/15 hover:bg-white/4",
          success: "!border-emerald-400/20 !bg-emerald-400/5",
          error: "!border-red-400/20 !bg-red-400/5",
          info: "!border-blue-400/20 !bg-blue-400/5",
          warning: "!border-amber-400/20 !bg-amber-400/5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
