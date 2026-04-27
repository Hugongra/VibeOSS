/**
 * VibeOS Provider — Slack
 *
 * Posts messages to a Slack channel via Incoming Webhook URL.
 * Configured with SLACK_WEBHOOK_URL env var.
 */

import type { VibeProvider, ProviderPayload, ProviderResult } from "./types";

export class SlackProvider implements VibeProvider {
  name = "slack" as const;
  label = "Slack";

  private webhookUrl: string | undefined;

  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
  }

  isConfigured(): boolean {
    return typeof this.webhookUrl === "string" && this.webhookUrl.startsWith("https://");
  }

  async execute(payload: ProviderPayload): Promise<ProviderResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        error: "SLACK_WEBHOOK_URL is not configured.",
      };
    }

    const text = payload.body ?? payload.template ?? "Notification from VibeOS";

    try {
      const response = await fetch(this.webhookUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const err = await response.text();
        return { success: false, provider: this.name, error: `Slack API error: ${err}` };
      }

      return { success: true, provider: this.name, message: "Slack message sent" };
    } catch (error) {
      return {
        success: false,
        provider: this.name,
        error: error instanceof Error ? error.message : "Unknown Slack error",
      };
    }
  }
}
