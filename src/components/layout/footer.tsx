import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer>
      <Separator />
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} VibeOS. Bachelor Thesis &mdash; La
          Salle-URL.
        </p>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/Hugongra/VibeOSS"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Source
          </a>
          <a
            href="https://github.com/Hugongra/VibeOSS/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            License
          </a>
        </div>
      </div>
    </footer>
  );
}
