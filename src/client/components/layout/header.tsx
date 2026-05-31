import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { AppLogo } from "./app-logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navLinks = [
  { to: "/docs", label: "Documentation" },
  { to: "/builder", label: "Builder", auth: true },
] as const;

export function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <AppLogo />

        <nav className="hidden items-center gap-1 sm:flex">
          {navLinks.map((link) => {
            if ("auth" in link && link.auth && !isAuthenticated) return null;
            const active = location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href="https://github.com/Hugongra/VibeOSS"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            GitHub
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <span className="hidden max-w-[140px] truncate text-xs text-muted-foreground sm:inline">
                {user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" render={<Link to="/login" />}>
              Sign in
            </Button>
          )}
        </div>
      </div>
      <Separator className="opacity-60" />
    </header>
  );
}
