/**
 * VibeOS Provider — Email (Resend)
 *
 * Sends transactional emails via the Resend API.
 * Configured with RESEND_API_KEY and RESEND_FROM env vars.
 */

import type { VibeProvider, ProviderPayload, ProviderResult } from "./types";

export class EmailProvider implements VibeProvider {
  name = "email" as const;
  label = "Email (Resend)";

  private apiKey: string | undefined;
  private from: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY;
    this.from = process.env.RESEND_FROM ?? "VibeOS <noreply@vibeoss.dev>";
  }

  isConfigured(): boolean {
    return typeof this.apiKey === "string" && this.apiKey.length > 0;
  }

  async execute(payload: ProviderPayload): Promise<ProviderResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        provider: this.name,
        error: "RESEND_API_KEY is not configured.",
      };
    }

    const to = payload.to ?? payload.record?.["email"] as string | undefined;
    if (!to) {
      return {
        success: false,
        provider: this.name,
        error: "No recipient ('to' or record.email) provided.",
      };
    }

    const subject = payload.subject ?? "Notification from VibeOS";
    const body = payload.body ?? payload.template ?? "";

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.from,
          to: [to],
          subject,
          html: `<div style="font-family:sans-serif;color:#fafafa;background:#09090b;padding:24px;border-radius:8px;">${body}</div>`,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return { success: false, provider: this.name, error: `Resend API error: ${err}` };
      }

      const data = (await response.json()) as Record<string, unknown>;
      return { success: true, provider: this.name, message: `Email sent to ${to}`, data };
    } catch (error) {
      return {
        success: false,
        provider: this.name,
        error: error instanceof Error ? error.message : "Unknown email error",
      };
    }
  }
}
