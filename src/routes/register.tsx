import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { AuthShell, SocialButton } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — Black Rose" },
      { name: "description", content: "Create your Black Rose account to build teams and compete in community tournaments." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
    discord: "",
    riot: "",
    steam: "",
    country: "",
    accept: false,
  });

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // Frontend flow only — redirect to placeholder user dashboard (home for now).
    navigate({ to: "/" });
  }

  return (
    <AuthShell
      headline="Forge Your Legacy"
      subheadline="Create your Black Rose account to build teams, register for tournaments, and rise through the brackets."
    >
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          <span className="h-px w-10 bg-border" />
          New Recruit
        </div>
        <h2 className="font-display text-4xl tracking-display">Create Account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Required fields are marked. Game IDs can be added later from your profile.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Username *">
            <Input value={form.username} onChange={(v) => update("username", v)} placeholder="thornn" required />
          </Field>
          <Field label="Email *">
            <Input type="email" value={form.email} onChange={(v) => update("email", v)} placeholder="you@blackrose.gg" required />
          </Field>
          <Field label="Password *">
            <Input type="password" value={form.password} onChange={(v) => update("password", v)} placeholder="••••••••" required />
          </Field>
          <Field label="Confirm Password *">
            <Input type="password" value={form.confirm} onChange={(v) => update("confirm", v)} placeholder="••••••••" required />
          </Field>
        </div>

        <div className="mt-2 flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          <span className="h-px w-10 bg-border" />
          Optional — Game Identities
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Discord Username">
            <Input value={form.discord} onChange={(v) => update("discord", v)} placeholder="thornn#0001" />
          </Field>
          <Field label="Riot ID">
            <Input value={form.riot} onChange={(v) => update("riot", v)} placeholder="thornn#APAC" />
          </Field>
          <Field label="Steam ID">
            <Input value={form.steam} onChange={(v) => update("steam", v)} placeholder="STEAM_0:1:..." />
          </Field>
          <Field label="Country">
            <Input value={form.country} onChange={(v) => update("country", v)} placeholder="Philippines" />
          </Field>
        </div>

        <label className="mt-2 flex items-start gap-2 text-xs text-muted-foreground select-none">
          <input
            type="checkbox"
            required
            checked={form.accept}
            onChange={(e) => update("accept", e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 border border-border bg-secondary accent-foreground"
          />
          <span>
            I agree to the{" "}
            <span className="text-foreground underline-offset-4 hover:underline cursor-pointer">Terms and Conditions</span>{" "}
            and Black Rose competitive ruleset.
          </span>
        </label>

        <button
          type="submit"
          className="clip-cta mt-2 inline-flex h-11 items-center justify-center bg-foreground px-6 text-xs font-tech uppercase tracking-wider-2 text-background transition hover:bg-foreground/90"
        >
          Create Account
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

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Already enlisted?{" "}
        <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
          Sign In
        </Link>
      </p>
    </AuthShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      required={required}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full border border-border bg-secondary px-4 text-sm outline-none transition focus:border-foreground"
    />
  );
}
