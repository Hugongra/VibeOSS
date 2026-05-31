import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/builder");
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col justify-center px-6 sm:px-12 lg:max-w-md">
        <div className="mx-auto w-full max-w-sm">
          <AppLogo className="mb-10" />

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access the Builder and your saved chats.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="rounded-lg"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-lg"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full rounded-lg" disabled={loading}>
              {loading ? "Signing in…" : "Continue"}
              {!loading && <ArrowRight className="size-4" />}
            </Button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground">
            No account?{" "}
            <Link
              to="/register"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create one
            </Link>
            {" · "}
            <Link
              to="/docs"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Documentation
            </Link>
          </p>
        </div>
      </div>

      <div className="vibe-page-gradient hidden flex-1 items-center justify-center border-l border-border/60 lg:flex">
        <Card className="max-w-sm border-primary/20 bg-card/80 shadow-lg backdrop-blur-sm">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-6" />
            </div>
            <p className="text-sm font-medium text-foreground">
              Describe what you need. VibeOS builds it.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Natural language in, working application out. Iterate through chat
              to refine your software in seconds.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
