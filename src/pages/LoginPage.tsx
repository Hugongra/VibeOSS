import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

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
      {/* Left — form */}
      <div className="flex flex-1 flex-col justify-center px-6 sm:px-12 lg:max-w-md">
        <div className="w-full max-w-sm mx-auto">
          <Link
            to="/"
            className="mb-12 inline-block text-sm font-semibold tracking-tight text-foreground"
          >
            VibeOS
          </Link>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your credentials to access the builder.
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
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Continue"}
            </Button>
          </form>

          <p className="mt-6 text-xs text-muted-foreground">
            No account?{" "}
            <Link to="/login" className="text-foreground underline underline-offset-4">
              Request access
            </Link>
          </p>
        </div>
      </div>

      {/* Right — panel */}
      <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-center lg:border-l lg:border-border lg:bg-card">
        <div className="max-w-xs text-center">
          <p className="text-sm font-medium text-foreground">
            Describe what you need. VibeOS builds it.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Natural language in, working application out.
          </p>
        </div>
      </div>
    </div>
  );
}
