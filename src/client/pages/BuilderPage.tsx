import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Loader2, MessageSquarePlus, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { AppLogo } from "@/components/layout/app-logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { SchemaPreviewPanel } from "@/components/vibe-ui/schema-preview-panel";
import type { VibeChatMessage, VibeChatSummary, VibeSchemaV1 } from "@shared/types";
import { generateSchema, getChat, listChats } from "@/lib/vibe-api";
import { cn } from "@/lib/utils";

type BuilderPanel = "chat" | "preview";

const STARTER_PROMPTS = [
  "Create a CRM with contacts and deals",
  "Build a solar lead tracker with status and currency",
  "Make a simple todo app with priority",
];

function parseGeneratedSchema(json: Record<string, unknown>): VibeSchemaV1 | null {
  if (typeof json.schema === "object" && json.schema !== null) {
    return json.schema as VibeSchemaV1;
  }
  return null;
}

function formatChatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function ChatBubble({ message }: { message: VibeChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md border border-border bg-card text-foreground shadow-sm"
        )}
      >
        {!isUser && (
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            VibeOS
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
    </div>
  );
}

export function BuilderPage() {
  const { user, logout } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<VibeChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedSchema, setGeneratedSchema] = useState<VibeSchemaV1 | null>(null);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [selectedViewName, setSelectedViewName] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<BuilderPanel>("chat");
  const [chats, setChats] = useState<VibeChatSummary[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [chatsError, setChatsError] = useState<string | null>(null);

  const refreshChats = useCallback(async () => {
    setChatsLoading(true);
    setChatsError(null);
    try {
      const result = await listChats();
      if (!result.ok) {
        setChatsError(result.error);
        setChats([]);
        return;
      }
      setChats(result.chats);
    } catch (e) {
      setChatsError(e instanceof Error ? e.message : "Failed to load chats");
      setChats([]);
    } finally {
      setChatsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshChats();
  }, [refreshChats]);

  function startNewChat() {
    setChatId(null);
    setHistory([]);
    setGeneratedSchema(null);
    setModuleId(null);
    setSelectedViewName(null);
    setPrompt("");
    setActivePanel("chat");
  }

  async function openChat(id: string) {
    setLoading(true);
    try {
      const result = await getChat(id);
      if (!result.ok) {
        setChatsError(result.error);
        return;
      }
      setChatId(result.chatId);
      setHistory(result.messages);
      setModuleId(result.moduleId);
      setGeneratedSchema(result.schema);
      setSelectedViewName(result.schema?.views[0]?.name ?? null);
      setActivePanel("chat");
    } catch (e) {
      setChatsError(e instanceof Error ? e.message : "Failed to open chat");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!generatedSchema) {
      setSelectedViewName(null);
      return;
    }
    const names = generatedSchema.views.map((v) => v.name);
    if (!selectedViewName || !names.includes(selectedViewName)) {
      setSelectedViewName(generatedSchema.views[0]?.name ?? null);
    }
  }, [generatedSchema, selectedViewName]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMessage = prompt.trim();
    setPrompt("");
    setHistory((h) => [
      ...h,
      { role: "user", text: userMessage, createdAt: new Date().toISOString() },
    ]);
    setLoading(true);

    try {
      const result = await generateSchema({
        prompt: userMessage,
        chatId,
        moduleId,
        existingSchema: generatedSchema,
      });

      if (!result.ok) {
        const body = result.json;
        const err = String(body.error ?? "Request failed");
        const details =
          Array.isArray(body.details) && body.details.length > 0
            ? `\n\n${body.details.map(String).join("\n")}`
            : "";
        setHistory((h) => [
          ...h,
          {
            role: "assistant",
            text: `API error (${result.status}): ${err}${details}`,
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }

      const schema = parseGeneratedSchema(result.json);
      const persistedModuleId =
        typeof result.json.moduleId === "string" ? result.json.moduleId : null;
      const persistedChatId =
        typeof result.json.chatId === "string" ? result.json.chatId : chatId;
      const assistantText =
        typeof result.json.modified === "boolean" && result.json.modified
          ? `Updated "${schema?.module ?? "application"}" based on your request.`
          : `Created "${schema?.module ?? "application"}". Keep chatting to refine it.`;

      if (schema) {
        setGeneratedSchema(schema);
        setModuleId(persistedModuleId);
        setChatId(persistedChatId);
        setSelectedViewName(schema.views[0]?.name ?? null);
        setActivePanel("preview");
        void refreshChats();
      }

      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          text: assistantText,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      const isNetwork =
        message === "Failed to fetch" ||
        /network|fetch|API server|Empty response|Invalid JSON|backend/i.test(message);
      const hint = isNetwork
        ? "Start both servers: npm run dev and npm run dev:server (or npm run dev:all)."
        : message;
      setHistory((h) => [
        ...h,
        {
          role: "assistant",
          text: `Error: ${hint}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <AppLogo to="/builder" />
          <Separator orientation="vertical" className="hidden h-5 sm:block" />
          <Button
            variant="ghost"
            size="sm"
            className="hidden text-muted-foreground sm:inline-flex"
            render={<Link to="/docs" />}
          >
            <BookOpen className="size-4" />
            Docs
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[160px] truncate text-xs text-muted-foreground md:inline">
            {user?.email}
          </span>
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 bg-sidebar sm:flex">
          <div className="flex items-center justify-between p-3">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Chats
            </p>
            <Button variant="outline" size="xs" onClick={startNewChat}>
              <Plus className="size-3" />
              New
            </Button>
          </div>
          <Separator className="opacity-60" />
          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
            {chatsLoading ? (
              <div className="flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Loading…
              </div>
            ) : chatsError ? (
              <div className="space-y-2 px-2 py-2">
                <p className="text-xs text-destructive">{chatsError}</p>
                <Button variant="ghost" size="xs" onClick={() => void refreshChats()}>
                  Retry
                </Button>
              </div>
            ) : chats.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <MessageSquarePlus className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  No chats yet. Describe an app to start building.
                </p>
              </div>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.chatId}
                  type="button"
                  onClick={() => void openChat(chat.chatId)}
                  className={cn(
                    "w-full rounded-lg px-3 py-2.5 text-left transition-colors",
                    chatId === chat.chatId
                      ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border"
                      : "hover:bg-sidebar-accent/60"
                  )}
                >
                  <p className="truncate text-sm font-medium text-foreground">
                    {chat.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {chat.messageCount} msgs · {formatChatDate(chat.updatedAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 border-b border-border/60 lg:hidden">
            {(["chat", "preview"] as const).map((panel) => (
              <button
                key={panel}
                type="button"
                onClick={() => setActivePanel(panel)}
                className={cn(
                  "flex-1 px-4 py-2.5 text-xs font-medium capitalize transition-colors",
                  activePanel === panel
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {panel}
                {panel === "preview" && generatedSchema && (
                  <span className="ml-1.5 inline-block size-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div
              className={cn(
                "flex min-h-0 flex-1 flex-col lg:border-r lg:border-border/60",
                activePanel === "preview" ? "hidden lg:flex" : "flex"
              )}
            >
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
                {history.length === 0 ? (
                  <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center text-center">
                    <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <MessageSquarePlus className="size-6" />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">
                      What do you want to build?
                    </h2>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                      Describe your app in plain language. Keep chatting to add
                      fields, entities, or change anything.
                    </p>
                    <div className="mt-8 flex w-full max-w-lg flex-col gap-2">
                      {STARTER_PROMPTS.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPrompt(s)}
                          className="rounded-lg border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-foreground"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mx-auto max-w-2xl space-y-4">
                    {history.map((msg, i) => (
                      <ChatBubble key={i} message={msg} />
                    ))}
                    {loading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        {generatedSchema ? "Updating application…" : "Generating schema…"}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-border/60 bg-card/30 p-4">
                <form
                  onSubmit={handleSubmit}
                  className="mx-auto flex max-w-2xl items-end gap-2"
                >
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={
                      generatedSchema
                        ? "Describe what to change…"
                        : "Describe your application…"
                    }
                    className="min-h-11 max-h-32 resize-none rounded-xl bg-background"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={loading || !prompt.trim()}
                    className="rounded-xl"
                  >
                    Send
                  </Button>
                </form>
              </div>
            </div>

            <div
              className={cn(
                "flex min-h-0 w-full flex-col bg-muted/20 lg:w-[min(440px,42%)] lg:shrink-0 xl:w-[min(520px,45%)]",
                activePanel === "chat" ? "hidden lg:flex" : "flex"
              )}
            >
              <SchemaPreviewPanel
                schema={generatedSchema}
                moduleId={moduleId}
                selectedViewName={selectedViewName}
                onViewChange={setSelectedViewName}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
