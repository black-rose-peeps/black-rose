import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminConsoleLogin } from "@/features/admin/auth/AdminConsoleLogin";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { DiscordButton } from "@/features/auth/components/DiscordButton";
import { simulateDiscordLogin } from "@/features/auth/store/session";

type LoginSearch = {
  console?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    console: typeof search.console === "string" ? search.console : undefined,
  }),
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
  const navigate = useNavigate();
  const { console: consoleParam } = Route.useSearch();
  const [showAdminConsole, setShowAdminConsole] = useState(consoleParam === "1");

  function handleLogin() {
    // TODO: Replace with real Discord OAuth2 redirect when backend is ready.
    simulateDiscordLogin();
    navigate({ to: "/dashboard" });
  }

  if (showAdminConsole) {
    return (
      <AuthShell
        headline="Operations"
        subheadline="Tournament administrators sign in with credentials created in the Members panel."
      >
        <AdminConsoleLogin
          onBack={() => {
            setShowAdminConsole(false);
            navigate({ to: "/login", search: {} });
          }}
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      headline="Welcome Back"
      subheadline="Sign in with your Discord account to manage your team, register for tournaments, and track your competitive journey."
    >
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

      <div className="flex flex-col gap-4">
        <DiscordButton onClick={handleLogin} />

        <p className="text-center text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          You will be redirected to Discord to authorize access.
        </p>
      </div>

      <div className="my-8 h-px bg-border" />

      <div className="flex flex-col gap-3 text-center text-xs text-muted-foreground">
        <p>
          New to Black Rose?{" "}
          <Link to="/register" className="text-foreground underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
        <p>
          Admin?{" "}
          <button
            type="button"
            onClick={() => {
              setShowAdminConsole(true);
              navigate({ to: "/login", search: { console: "1" } });
            }}
            className="text-foreground underline-offset-4 hover:underline"
          >
            Enter Console
          </button>
        </p>
      </div>
    </AuthShell>
  );
}
