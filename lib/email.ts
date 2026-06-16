import { env } from "@/lib/env";
import { LeadKind } from "@/lib/enums";

/**
 * Email sending for trade-house.
 *
 * Provider priority:
 *   1. SendGrid — when SENDGRID_API_KEY + SENDGRID_FROM_EMAIL are set.
 *   2. Console — dev fallback that logs the message and succeeds, so auth flows
 *      aren't blocked before an email provider is configured. OTP codes print
 *      to the terminal.
 *
 * SendGrid is imported lazily so the package is only required when actually
 * used (it isn't a dependency of this app yet — add `@sendgrid/mail` if you
 * want real emails in dev).
 */
interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  const plainText = text || html.replace(/<[^>]*>/g, "");

  if (env.SENDGRID_API_KEY && env.SENDGRID_FROM_EMAIL) {
    try {
      const sgMail = (await import("@sendgrid/mail")).default;
      sgMail.setApiKey(env.SENDGRID_API_KEY);
      await sgMail.send({
        to,
        from: env.SENDGRID_FROM_EMAIL,
        subject,
        html,
        text: plainText,
      });
      console.log(`[email] Sent via SendGrid → ${to}`);
      return { success: true };
    } catch (error) {
      console.error("[email] SendGrid send error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send email",
      };
    }
  }

  // Console fallback (dev) — never blocks the flow.
  console.log(`
========================================
📧 Email (no provider — dev fallback)
========================================
To: ${to}
Subject: ${subject}
${plainText.slice(0, 300)}
========================================
  `);
  return { success: true };
}

/** Send a one-time passcode for sign-in / email verification. */
export async function sendOTPEmail(
  email: string,
  otp: string,
  type: "sign-in" | "email-verification" | "forget-password" | "change-email",
): Promise<{ success: boolean; error?: string }> {
  const subject =
    type === "sign-in"
      ? "Your Trade House sign-in code"
      : type === "forget-password"
        ? "Reset your Trade House password"
        : "Verify your Trade House email";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    <div style="background:#0f766e;padding:36px 20px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:26px;font-weight:600;">🏠 Trade House</h1>
    </div>
    <div style="padding:36px 30px;">
      <h2 style="margin:0 0 16px;color:#1f2937;font-size:22px;">Your verification code</h2>
      <p style="margin:0 0 20px;color:#4b5563;font-size:16px;line-height:1.6;">
        Use the code below to continue. It expires in 10 minutes.
      </p>
      <div style="background:#ecfdf5;border:2px dashed #0f766e;border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
        <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#0f766e;font-family:'Courier New',monospace;">${otp}</div>
      </div>
      <p style="color:#6b7280;font-size:14px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({ to: email, subject, html });
}

/** Notify an owner/agent that a new enquiry (lead) arrived on their listing. */
export async function sendLeadEmail(opts: {
  to: string;
  ownerName: string;
  listingTitle: string;
  listingUrl: string;
  seekerName: string;
  phone: string;
  email?: string;
  message?: string;
  kind?: LeadKind;
  preferredTime?: string;
}): Promise<{ success: boolean; error?: string }> {
  const isViewing = opts.kind === LeadKind.Viewing;
  const heading = isViewing ? "Viewing request" : "New enquiry";
  const subject = isViewing
    ? `Viewing request for "${opts.listingTitle}"`
    : `New enquiry for "${opts.listingTitle}"`;
  // Render the preferred viewing time in NZ local format when present.
  const preferredTimeLabel =
    isViewing && opts.preferredTime
      ? new Date(opts.preferredTime).toLocaleString("en-NZ", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    <div style="background:#0f766e;padding:32px 20px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:600;">🏠 ${heading}</h1>
    </div>
    <div style="padding:32px 30px;">
      <p style="margin:0 0 16px;color:#1f2937;font-size:16px;">Hi ${opts.ownerName || "there"},</p>
      <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
        ${
          isViewing
            ? `Someone would like to <strong>view</strong> your property <strong>${opts.listingTitle}</strong>.`
            : `You have a new enquiry on <strong>${opts.listingTitle}</strong>.`
        }
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:18px 20px;margin:0 0 22px;">
        <p style="margin:0 0 6px;font-size:14px;color:#334155;"><strong>Name:</strong> ${opts.seekerName}</p>
        <p style="margin:0 0 6px;font-size:14px;color:#334155;"><strong>Phone:</strong> ${opts.phone}</p>
        ${opts.email ? `<p style="margin:0 0 6px;font-size:14px;color:#334155;"><strong>Email:</strong> ${opts.email}</p>` : ""}
        ${preferredTimeLabel ? `<p style="margin:0 0 6px;font-size:14px;color:#334155;"><strong>Preferred time:</strong> ${preferredTimeLabel}</p>` : ""}
        ${opts.message ? `<p style="margin:8px 0 0;font-size:14px;color:#334155;"><strong>Message:</strong><br>${opts.message}</p>` : ""}
      </div>
      <a href="${opts.listingUrl}" style="display:inline-block;background:#0f766e;color:#fff;padding:11px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">View listing</a>
      <p style="margin:20px 0 0;color:#6b7280;font-size:13px;">Reach out to the enquirer directly using the details above.</p>
    </div>
  </div>
</body>
</html>`;
  return sendEmail({ to: opts.to, subject, html });
}

/** Notify a seeker that new listings match one of their saved searches. */
export async function sendNewMatchEmail(opts: {
  to: string;
  seekerName: string;
  searchName: string;
  manageUrl: string;
  listings: {
    title: string;
    priceLabel: string;
    locality: string;
    city: string;
    url: string;
  }[];
  moreCount: number;
}): Promise<{ success: boolean; error?: string }> {
  const n = opts.listings.length + opts.moreCount;
  const subject = `${n} new ${n === 1 ? "match" : "matches"} for "${opts.searchName}"`;
  const rows = opts.listings
    .map(
      (l) => `
      <a href="${l.url}" style="display:block;text-decoration:none;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin:0 0 10px;">
        <div style="font-size:15px;font-weight:600;color:#1f2937;">${l.title}</div>
        <div style="font-size:13px;color:#6b7280;margin-top:2px;">${l.locality}, ${l.city}</div>
        <div style="font-size:14px;font-weight:600;color:#0f766e;margin-top:6px;">${l.priceLabel}</div>
      </a>`,
    )
    .join("");
  const more =
    opts.moreCount > 0
      ? `<p style="margin:4px 0 0;font-size:13px;color:#6b7280;">…and ${opts.moreCount} more.</p>`
      : "";
  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background:#f5f5f5;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    <div style="background:#0f766e;padding:32px 20px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:600;">🏠 New matches</h1>
    </div>
    <div style="padding:32px 30px;">
      <p style="margin:0 0 16px;color:#1f2937;font-size:16px;">Hi ${opts.seekerName || "there"},</p>
      <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">
        New ${n === 1 ? "listing matches" : "listings match"} your saved search
        <strong>${opts.searchName}</strong>:
      </p>
      ${rows}
      ${more}
      <a href="${opts.manageUrl}" style="display:inline-block;margin-top:18px;background:#0f766e;color:#fff;padding:11px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Manage saved searches</a>
      <p style="margin:20px 0 0;color:#6b7280;font-size:13px;">You're receiving this because alerts are on for this saved search.</p>
    </div>
  </div>
</body>
</html>`;
  return sendEmail({ to: opts.to, subject, html });
}
