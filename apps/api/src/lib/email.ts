/**
 * Email service via Resend.
 * Set RESEND_API_KEY in your environment.
 * Verify your domain at resend.com/domains first.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const FROM = process.env.EMAIL_FROM ?? "Uncover <noreply@uncover.thealxlabs.ca>";
const WEB_URL = process.env.WEB_URL ?? "http://localhost:3000";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email");
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[email] Resend error:", err);
    // Don't throw — email failure shouldn't break signup
  }
}

export async function sendWelcomeEmail(
  email: string,
  apiKey: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: "Welcome to Uncover — your API key",
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#080808;font-family:'Courier New',monospace;color:#e8e8e8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:48px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#0f0f0f;border:1px solid #1c1c1c;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px;border-bottom:1px solid #1c1c1c;">
              <span style="font-family:Arial,sans-serif;font-weight:900;font-size:16px;letter-spacing:0.12em;color:#e8e8e8;text-transform:uppercase;">UNCOVER</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <p style="font-size:13px;color:#555;margin:0 0 24px;line-height:1.8;">
                Welcome. Your account is ready.
              </p>

              <p style="font-size:13px;color:#555;margin:0 0 8px;">Your API key:</p>
              <div style="background:#080808;border:1px solid rgba(232,255,71,0.2);padding:16px 20px;margin-bottom:24px;word-break:break-all;">
                <span style="font-size:12px;color:#e8ff47;letter-spacing:0.05em;">${apiKey}</span>
              </div>

              <p style="font-size:11px;color:#333;margin:0 0 32px;line-height:1.8;">
                Save this key — it won't be shown again. Use it in the Authorization header as <span style="color:#555;">Bearer sk_live_...</span>
              </p>

              <!-- Quick start -->
              <p style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:#2a2a2a;margin:0 0 16px;">Quick start</p>
              <div style="background:#080808;border:1px solid #1c1c1c;padding:16px 20px;margin-bottom:32px;">
                <pre style="margin:0;font-size:11px;color:#555;line-height:1.8;white-space:pre-wrap;">curl -X POST ${WEB_URL.replace("3000", "3001")}/api/search \\
  -H "Authorization: Bearer ${apiKey.slice(0, 20)}..." \\
  -d '{"query":"your topic","sources":["reddit"]}'</pre>
              </div>

              <a href="${WEB_URL}/dashboard" style="display:inline-block;background:#e8ff47;color:#000;font-family:'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:14px 24px;text-decoration:none;">
                Open Dashboard →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #1c1c1c;">
              <p style="font-size:10px;color:#2a2a2a;margin:0;line-height:1.8;">
                Uncover · Built by TheAlxLabs · Credits never expire
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}
