/**
 * VibeOS Provider — Webhook
 *
 * Calls any external HTTP endpoint. Used for custom integrations,
 * Zapier/Make webhooks, or internal microservices.
 */

import type { VibeProvider, ProviderPayload, ProviderResult } from "./types";

export class WebhookProvider implements VibeProvider {
  name = "webhook" as const;
  label = "Webhook (HTTP)";

  isConfigured(): boolean {
    return true;
  }

  async execute(payload: ProviderPayload): Promise<ProviderResult> {
    const url = payload.url;
    if (!url) {
      return {
        success: false,
        provider: this.name,
        error: "No 'url' provided for webhook.",
      };
    }

    const method = payload.method ?? "POST";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...payload.headers,
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method !== "GET" ? JSON.stringify(payload.data ?? payload.record ?? {}) : undefined,
      });

      const responseData = await response.text();

      if (!response.ok) {
        return {
          success: false,
          provider: this.name,
          error: `Webhook returned ${response.status}: ${responseData.slice(0, 500)}`,
        };
      }

      return {
        success: true,
        provider: this.name,
        message: `Webhook ${method} ${url} → ${response.status}`,
        data: { status: response.status, body: responseData.slice(0, 1000) },
      };
    } catch (error) {
      return {
        success: false,
        provider: this.name,
        error: error instanceof Error ? error.message : "Unknown webhook error",
      };
    }
  }
}
