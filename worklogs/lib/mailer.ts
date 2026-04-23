/**
 * Work Report Auto-Sender — Mailer
 *
 * Sends the generated Markdown report via SMTP using nodemailer.
 * Markdown is sent both as plain-text and as a simple HTML <pre> block.
 */

import nodemailer from "nodemailer";
import {
  EMAIL_CC,
  EMAIL_FROM,
  EMAIL_TO,
  SMTP_CONFIG,
  type ReportMode,
} from "./config.js";
import { buildDateRangeLabel } from "./report-generator.js";

// ─── Transporter factory ──────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_CONFIG.host,
    port: SMTP_CONFIG.port,
    secure: SMTP_CONFIG.secure,
    // Force IPv4 — prevents EHOSTUNREACH on networks without IPv6 routing.
    // Typed as `any` because @types/nodemailer v8 omits the `family` field.
    family: 4,
    // For port 587 STARTTLS: require TLS upgrade after plain connection
    requireTLS: !SMTP_CONFIG.secure,
    auth: {
      user: SMTP_CONFIG.user,
      pass: SMTP_CONFIG.pass,
    },
  } as Parameters<typeof nodemailer.createTransport>[0]);
}

// ─── Markdown → minimal HTML ──────────────────────────────────────────────────

function markdownToHtml(md: string): string {
  // Escape HTML special chars, then wrap in <pre> for faithful rendering.
  // Teams / Outlook will at least show the raw text cleanly.
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background:#f9f9f9; padding:24px; }
  pre  { background:#fff; border:1px solid #e1e4e8; border-radius:6px; padding:16px;
         font-size:13px; line-height:1.6; white-space:pre-wrap; word-break:break-word; }
</style>
</head><body><pre>${escaped}</pre></body></html>`;
}

// ─── Send ─────────────────────────────────────────────────────────────────────

export interface SendOptions {
  markdown: string;
  since: string;
  until: string;
  mode: ReportMode;
  /** Optional extra recipients to CC for this send */
  extraCc?: string[];
}

export async function sendReport(opts: SendOptions): Promise<void> {
  const { markdown, since, until, mode, extraCc = [] } = opts;

  const dateLabel = buildDateRangeLabel(since, until);
  const modeLabel = mode === "daily" ? "Daily" : "Weekly";
  const subject = `[Work Report] ${modeLabel} — ${dateLabel}`;

  const transporter = createTransporter();

  // Verify connection before sending
  await transporter.verify();

  const cc = [...EMAIL_CC, ...extraCc].filter(Boolean);

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: EMAIL_TO.join(", "),
    ...(cc.length ? { cc: cc.join(", ") } : {}),
    subject,
    text: markdown,
    html: markdownToHtml(markdown),
  });

  console.log(
    `✉️  Report sent → ${EMAIL_TO.join(", ")}${cc.length ? `  CC: ${cc.join(", ")}` : ""}`
  );
}
