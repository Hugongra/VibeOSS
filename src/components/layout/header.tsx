import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link to="/" className="text-sm font-semibold tracking-tight text-foreground">
          VibeOS
        </Link>

        <nav className="flex items-center gap-6">
          <a
            href="https://github.com/Hugongra/VibeOSS"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            GitHub
          </a>
          <Link
            to="/login"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </nav>
      </div>
      <Separator />
    </header>
  );
}
