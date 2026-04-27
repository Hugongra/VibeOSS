/**
 * VibeOS Provider System — Common Interface
 *
 * Every external integration (email, Slack, webhook, etc.) implements
 * this interface. The Action Executor resolves providers by channel/type
 * and delegates execution.
 *
 * Inspired by Rebolt's provider architecture — modular, typed, extensible.
 */

/** Payload passed to a provider when executing an action */
export interface ProviderPayload {
  to?: string;
  subject?: string;
  body?: string;
  template?: string;
  url?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  data?: Record<string, unknown>;
  /** Interpolated record data (e.g. {{full_name}} resolved) */
  record?: Record<string, unknown>;
}

/** Result returned by every provider after execution */
export interface ProviderResult {
  success: boolean;
  provider: string;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

/** The contract every provider must implement */
export interface VibeProvider {
  /** Unique name (e.g. "email", "slack", "webhook") */
  name: string;
  /** Human-readable label */
  label: string;
  /** Check if the provider is configured and ready */
  isConfigured(): boolean;
  /** Execute the provider action */
  execute(payload: ProviderPayload): Promise<ProviderResult>;
}
