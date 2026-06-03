import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { DiscordButton } from "@/features/auth/components/DiscordButton";
import { simulateDiscordLogin } from "@/features/auth/store/session";

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
  const navigate = useNavigate();

  function handleLogin() {
    // TODO: Replace with real Discord OAuth2 redirect when backend is ready.
    // Simulates a verified login → redirects to member dashboard.
    simulateDiscordLogin();
    navigate({ to: "/dashboard" });
  }

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
        <DiscordButton onClick={handleLogin} />

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
