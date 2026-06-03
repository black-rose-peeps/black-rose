import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { redirectToDiscordLogin } from "@/features/auth/services/discord";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Black Rose" },
      {
        name: "description",
        content: "Sign in to your Black Rose account via Discord.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthShell
      headline="Welcome Back"
      subheadline="Sign in with your Discord account to manage your team, register for tournaments, and track your competitive journey."
    >
      {/* Heading */}
      <div className="mb-10">
        <div className="mb-3 flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          <span className="h-px w-10 bg-border" />
          Access Console
        </div>
        <h2 className="font-display text-4xl tracking-display">Sign In</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Black Rose uses Discord for authentication. One click, no passwords.
        </p>
      </div>

      {/* Discord CTA */}
      <div className="flex flex-col gap-4">
        <DiscordButton onClick={redirectToDiscordLogin} />

        <p className="text-center text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          You will be redirected to Discord to authorize access.
        </p>
      </div>

      {/* Divider */}
      <div className="my-8 h-px bg-border" />

      {/* Footer links */}
      <div className="flex flex-col gap-3 text-center text-xs text-muted-foreground">
        <p>
          New to Black Rose?{" "}
          <Link to="/register" className="text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
        <p>
          Admin?{" "}
          <Link to="/admin" className="text-foreground underline-offset-4 hover:underline">
            Enter Console
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

function DiscordButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer group relative inline-flex h-14 w-full items-center justify-center gap-3 bg-[#5865F2] px-6 font-tech text-sm uppercase tracking-wider-2 text-white transition hover:bg-[#4752c4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5865F2]"
    >
      {/* Discord logo mark */}
      <DiscordIcon className="h-5 w-5 shrink-0" />
      Continue with Discord
    </button>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Discord"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}
