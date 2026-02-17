import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-6">
      {/* Hero */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--secondary)] px-4 py-1.5 text-sm text-[var(--muted-foreground)]">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--primary)]" />
          Open Source &middot; Metadata-Driven &middot; AI-Native
        </div>

        <h1 className="mb-4 text-5xl font-bold tracking-tight text-[var(--foreground)] sm:text-6xl">
          Build apps with
          <span className="bg-gradient-to-r from-[#6d5cff] to-[#a78bfa] bg-clip-text text-transparent">
            {" "}
            intent
          </span>
          , not code.
        </h1>

        <p className="mb-8 text-lg leading-relaxed text-[var(--muted-foreground)]">
          VibeOS compiles natural language into dynamic schemas that generate
          your database, API, and UI — in real time. The open-source Salesforce
          alternative built for the AI era.
        </p>

        <div className="flex items-center justify-center gap-4">
          <Link
            to="/dashboard"
            className="inline-flex h-11 items-center rounded-lg bg-[var(--primary)] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
          <a
            href="https://github.com/Hugongra/VibeOSS"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center rounded-lg border border-[var(--border)] bg-transparent px-6 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--secondary)]"
          >
            GitHub
          </a>
        </div>
      </div>

      {/* Architecture Preview */}
      <div className="mt-20 w-full max-w-4xl">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8">
          <h2 className="mb-6 text-center text-sm font-medium uppercase tracking-widest text-[var(--muted-foreground)]">
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Step 1 */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)] text-sm font-bold text-white">
                1
              </div>
              <h3 className="mb-1 font-semibold text-[var(--foreground)]">
                Describe
              </h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Express your intent in natural language.
                &quot;Create a CRM with contacts, deals, and pipelines.&quot;
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)] text-sm font-bold text-white">
                2
              </div>
              <h3 className="mb-1 font-semibold text-[var(--foreground)]">
                Compile
              </h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                AI generates a Vibe-JSON schema defining your data model, API
                routes, and UI layout.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-5">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-[var(--primary)] text-sm font-bold text-white">
                3
              </div>
              <h3 className="mb-1 font-semibold text-[var(--foreground)]">
                Render
              </h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                The UI engine renders a fully functional app from the schema —
                instantly.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 pb-8 text-center text-xs text-[var(--muted-foreground)]">
        VibeOS &copy; {new Date().getFullYear()} &middot; Bachelor Thesis
        &middot; La Salle-URL
      </footer>
    </main>
  );
}
