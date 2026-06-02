import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthShell, SocialButton } from "@/features/auth/components/AuthShell";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Black Rose" },
      {
        name: "description",
        content: "Sign in to your Black Rose account to manage teams and tournaments.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Frontend flow only — pretend success and route home.
    navigate({ to: "/" });
  }

  return (
    <AuthShell
      headline="Welcome Back"
      subheadline="Sign in to manage your team, register for tournaments, and track your competitive journey."
    >
      <div className="mb-10">
        <div className="mb-3 flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          <span className="h-px w-10 bg-border" />
          Access Console
        </div>
        <h2 className="font-display text-4xl tracking-display">Sign In</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your credentials to continue. Frontend preview — no auth yet.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="player@blackrose.gg"
            className="h-11 w-full border border-border bg-secondary px-4 text-sm outline-none transition focus:border-foreground"
          />
        </Field>

        <Field
          label="Password"
          trailing={
            <Link
              to="/login"
              className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground hover:text-foreground"
            >
              Forgot?
            </Link>
          }
        >
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-11 w-full border border-border bg-secondary px-4 text-sm outline-none transition focus:border-foreground"
          />
        </Field>

        <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-3.5 w-3.5 border border-border bg-secondary accent-foreground"
          />
          Remember me on this device
        </label>

        <button
          type="submit"
          className="clip-cta mt-2 inline-flex h-11 items-center justify-center bg-foreground px-6 text-xs font-tech uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
        >
          Sign In
        </button>

        <div className="my-2 flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Or continue with
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SocialButton label="Discord" />
          <SocialButton label="Google" />
        </div>
      </form>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/register" className="text-foreground underline-offset-4 hover:underline">
          Create Account
        </Link>
      </p>

      <p className="mt-6 text-center text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        Admin?{" "}
        <Link to="/admin" className="text-foreground hover:underline">
          Enter Console
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({
  label,
  trailing,
  children,
}: {
  label: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          {label}
        </label>
        {trailing}
      </div>
      {children}
    </div>
  );
}
