import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/20">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} VibeOS — Bachelor Thesis, La Salle-URL
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link
            to="/docs"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Documentation
          </Link>
          <Link
            to="/builder"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Builder
          </Link>
          <a
            href="https://github.com/Hugongra/VibeOSS"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
