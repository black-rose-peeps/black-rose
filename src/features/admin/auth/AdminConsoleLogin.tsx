import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAdminConsole } from "./admin-session";

interface AdminConsoleLoginProps {
  onBack: () => void;
}

export function AdminConsoleLogin({ onBack }: AdminConsoleLoginProps) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }

    setIsLoading(true);
    // Small artificial delay so it doesn't feel instant
    await new Promise((r) => setTimeout(r, 300));

    const ok = loginAdminConsole(username, password);
    setIsLoading(false);

    if (!ok) {
      setError("Invalid username or password.");
      return;
    }

    navigate({ to: "/admin" });
  }

  return (
    <div className="w-full">
      <div className="mb-10">
        <div className="mb-3 flex items-center gap-3 text-[10px] font-tech uppercase tracking-wider-2 text-muted-foreground">
          <span className="h-px w-10 bg-border" />
          Admin Console
        </div>
        <h2 className="font-display text-4xl tracking-display">Operations</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tournament administrators sign in with credentials created in the Members panel.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="admin-username">Username</Label>
          <Input
            id="admin-username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            placeholder="admin"
            autoComplete="username"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-password">Password</Label>
          <Input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isLoading}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          disabled={isLoading}
          className="mt-2 gap-2 font-tech uppercase tracking-wider"
        >
          <Shield className="h-4 w-4" />
          {isLoading ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      <div className="my-8 h-px bg-border" />

      <button
        type="button"
        onClick={onBack}
        className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Back to member sign in
      </button>
    </div>
  );
}
