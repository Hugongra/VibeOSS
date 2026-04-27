import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-6">
      {/* Hero */}
      <section className="py-24 sm:py-32">
        <p className="mb-4 text-sm text-muted-foreground">
          Open-source, metadata-driven platform
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Compile intent into applications.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
          VibeOS transforms natural-language descriptions into structured
          schemas that generate your database, API, and UI at runtime.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Button render={<Link to="/login" />}>Get started</Button>
          <Button
            variant="ghost"
            render={
              <a
                href="https://github.com/Hugongra/VibeOSS"
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            View source
          </Button>
        </div>
      </section>

      <Separator />

      {/* How it works */}
      <section className="py-20">
        <p className="mb-12 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          How it works
        </p>
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-3">
          <Step
            number="01"
            title="Describe"
            text="Write what you need in plain language. A CRM, a project tracker, an inventory system."
          />
          <Step
            number="02"
            title="Compile"
            text="The kernel parses your intent and generates a Vibe-JSON schema: data model, API, and UI layout."
          />
          <Step
            number="03"
            title="Render"
            text="The runtime engine reads the schema and renders a working application instantly."
          />
        </div>
      </section>

      <Separator />

      {/* Architecture */}
      <section className="py-20">
        <p className="mb-12 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Architecture
        </p>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          <ArchBlock
            title="Kernel"
            text="Parses natural language, validates schemas, and generates database migrations."
          />
          <ArchBlock
            title="Engine"
            text="Executes automations and actions defined in the schema at runtime."
          />
          <ArchBlock
            title="Renderer"
            text="Maps schema view definitions to UI components dynamically."
          />
          <ArchBlock
            title="Providers"
            text="Pluggable integrations for email, webhooks, Slack, and external services."
          />
        </div>
      </section>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div>
      <p className="mb-3 font-mono text-xs text-muted-foreground">{number}</p>
      <h3 className="mb-2 text-sm font-medium text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function ArchBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-card p-6">
      <h3 className="mb-2 text-sm font-medium text-foreground">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
