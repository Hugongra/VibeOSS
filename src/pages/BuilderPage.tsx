import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export function BuilderPage() {
  const { user, logout } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMessage = prompt.trim();
    setPrompt("");
    setHistory((h) => [...h, { role: "user", text: userMessage }]);
    setLoading(true);

    // TODO: Replace with real AI/kernel call
    await new Promise((r) => setTimeout(r, 1200));

    setHistory((h) => [
      ...h,
      {
        role: "assistant",
        text: `Schema generated for: "${userMessage}". This will create entities, views, and API routes based on your description. Connect the kernel to see live results.`,
      },
    ]);
    setLoading(false);
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          VibeOS
        </span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">{user?.email}</span>
          <Button variant="ghost" size="xs" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-border sm:block">
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Projects
            </p>
          </div>
          <Separator />
          <div className="p-4">
            <p className="text-xs text-muted-foreground">No projects yet.</p>
          </div>
        </aside>

        {/* Chat / Builder */}
        <div className="flex flex-1 flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {history.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                <h2 className="text-lg font-semibold text-foreground">
                  What do you want to build?
                </h2>
                <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
                  Describe your application in plain language. VibeOS will
                  generate the schema, database, API, and UI.
                </p>
              </div>
            ) : (
              <div className="mx-auto max-w-2xl space-y-6">
                {history.map((msg, i) => (
                  <div key={i}>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {msg.role === "user" ? "You" : "VibeOS"}
                    </p>
                    <p className="text-sm leading-relaxed text-foreground">
                      {msg.text}
                    </p>
                  </div>
                ))}
                {loading && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      VibeOS
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Generating schema...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <form
              onSubmit={handleSubmit}
              className="mx-auto flex max-w-2xl items-end gap-2"
            >
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your application..."
                className="min-h-10 max-h-32 resize-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <Button type="submit" disabled={loading || !prompt.trim()}>
                Send
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
