/**
 * VibeOS Provider Registry
 *
 * Central registry that maps channel names to provider instances.
 * The Action Executor uses this to resolve which provider handles
 * a given action.
 */

import type { VibeProvider } from "./types";
import { EmailProvider } from "./email";
import { WebhookProvider } from "./webhook";
import { SlackProvider } from "./slack";

class ProviderRegistry {
  private providers = new Map<string, VibeProvider>();

  constructor() {
    this.register(new EmailProvider());
    this.register(new WebhookProvider());
    this.register(new SlackProvider());
  }

  register(provider: VibeProvider): void {
    this.providers.set(provider.name, provider);
  }

  get(name: string): VibeProvider | undefined {
    return this.providers.get(name);
  }

  /** Resolve the best provider for a notification channel */
  resolveForChannel(channel: string): VibeProvider | undefined {
    const mapping: Record<string, string> = {
      email: "email",
      slack: "slack",
      teams: "webhook",
      in_app: "webhook",
    };
    return this.get(mapping[channel] ?? channel);
  }

  list(): VibeProvider[] {
    return Array.from(this.providers.values());
  }

  listConfigured(): VibeProvider[] {
    return this.list().filter((p) => p.isConfigured());
  }
}

/** Singleton registry — created once, reused across the server */
export const providerRegistry = new ProviderRegistry();
