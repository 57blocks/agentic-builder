/**
 * emailService — sends transactional emails via SMTP.
 *
 * Dev convenience: when SMTP_HOST is missing AND NODE_ENV !== "production",
 * the service writes the email payload to stdout instead of throwing.
 * This lets the magic-link flow work end-to-end on a developer's laptop
 * without configuring Mailtrap / Postmark.
 *
 * Workers can extend this with templates (welcome email, password reset)
 * — keep `sendMagicLinkEmail` exactly as-is so the auth controller's
 * contract stays stable.
 */

import nodemailer, { type Transporter } from "nodemailer";

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter | null {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS;

  if (!host) return null;

  cachedTransport = nodemailer.createTransport({
    host,
    port: port ? Number(port) : 587,
    secure: Number(port ?? 587) === 465,
    auth: user && pass ? { user, pass } : undefined,
  });
  return cachedTransport;
}

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const transport = getTransport();
  const isDev = (process.env.NODE_ENV ?? "development") !== "production";

  if (!transport) {
    if (!isDev) {
      throw new Error(
        "SMTP_HOST not configured. Set SMTP_HOST/PORT/USER/PASSWORD in backend/.env.",
      );
    }
    // Dev fallback — print to stdout so the developer can copy the link.
    console.log("[emailService] ===== (SMTP disabled — dev stub) =====");
    console.log(`[emailService] TO:      ${input.to}`);
    console.log(`[emailService] SUBJECT: ${input.subject}`);
    console.log(`[emailService] TEXT:\n${input.text}`);
    console.log("[emailService] ======================================");
    return;
  }

  const from = process.env.SMTP_FROM ?? "noreply@example.com";
  await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export async function sendMagicLinkEmail(
  to: string,
  link: string,
): Promise<void> {
  await sendEmail({
    to,
    subject: "Your sign-in link",
    text: `Click the link below to sign in (expires in 15 minutes):\n\n${link}\n\nIf you didn't request this, ignore this email.`,
    html: `
      <p>Click the link below to sign in (expires in 15 minutes):</p>
      <p><a href="${link}">${link}</a></p>
      <p style="color:#888;font-size:12px">If you didn't request this, ignore this email.</p>
    `,
  });
}
