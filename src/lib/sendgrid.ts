import sgMail from "@sendgrid/mail";

const FROM_EMAIL = "noreply@avel.africa";
const FROM_NAME = "Bugeti";

function init() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) throw new Error("SENDGRID_API_KEY is not set");
  sgMail.setApiKey(key);
}

// ─── Welcome email ─────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, displayName: string) {
  init();
  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: "Welcome to Bugeti 🎉",
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
        <tr>
          <td style="background:#16a34a;padding:32px;text-align:center">
            <p style="margin:0;font-size:48px">💰</p>
            <h1 style="margin:12px 0 0;color:#fff;font-size:24px;font-weight:700">Bugeti</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <h2 style="margin:0 0 8px;color:#111;font-size:20px">Welcome, ${displayName}!</h2>
            <p style="margin:0 0 20px;color:#555;line-height:1.6">
              Your Bugeti account is ready. Start taking control of your money — track spending, plan budgets, and share with your family.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f0fdf4;border-radius:10px;padding:16px;margin-bottom:16px">
                  <p style="margin:0;font-size:13px;color:#16a34a;font-weight:600">✅ Account created</p>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#888;font-size:12px;text-align:center">
              You're receiving this email because you created a Bugeti account.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// ─── OTP email ─────────────────────────────────────────────────────────────

export async function sendOtpEmail(to: string, otp: string) {
  init();
  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `${otp} is your Bugeti verification code`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
        <tr>
          <td style="background:#16a34a;padding:32px;text-align:center">
            <p style="margin:0;font-size:48px">🔐</p>
            <h1 style="margin:12px 0 0;color:#fff;font-size:24px;font-weight:700">Verify your email</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;text-align:center">
            <p style="margin:0 0 24px;color:#555;line-height:1.6">
              Enter this code in the Bugeti app to verify your email address.
            </p>
            <div style="background:#f0fdf4;border:2px dashed #16a34a;border-radius:12px;padding:24px;display:inline-block">
              <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#16a34a;font-family:monospace">${otp}</span>
            </div>
            <p style="margin:20px 0 0;color:#888;font-size:13px">
              This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
            </p>
            <p style="margin:24px 0 0;color:#bbb;font-size:12px">
              If you didn't request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// ─── Invitation email ──────────────────────────────────────────────────────

export async function sendInviteEmail(
  to: string,
  invitedBy: string,
  householdName: string,
  inviteUrl: string
) {
  init();
  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject: `${invitedBy} invited you to join ${householdName} on Bugeti`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
        <tr>
          <td style="background:#16a34a;padding:32px;text-align:center">
            <p style="margin:0;font-size:48px">🤝</p>
            <h1 style="margin:12px 0 0;color:#fff;font-size:24px;font-weight:700">You're invited to Bugeti</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 16px;color:#555;line-height:1.6">
              <strong>${invitedBy}</strong> has invited you to join the <strong>${householdName}</strong> budget on Bugeti — the smart budgeting app for Rwandan families.
            </p>
            <p style="margin:0 0 24px;color:#555;line-height:1.6">
              Click the button below to create your account and set your password.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="${inviteUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:10px">
                    Accept invitation →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#888;font-size:12px;text-align:center">
              This link expires in 24 hours. If you didn't expect this invitation, you can ignore this email.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}

// ─── Notification email ────────────────────────────────────────────────────

export async function sendNotificationEmail(
  to: string,
  displayName: string,
  subject: string,
  message: string
) {
  init();
  await sgMail.send({
    to,
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:system-ui,-apple-system,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06)">
        <tr>
          <td style="background:#16a34a;padding:24px 32px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:20px;font-weight:700">💰 Bugeti</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px">
            <p style="margin:0 0 8px;color:#888;font-size:13px">Hi ${displayName},</p>
            <p style="margin:0;color:#222;font-size:15px;line-height:1.7">${message}</p>
            <p style="margin:32px 0 0;color:#bbb;font-size:12px;text-align:center">
              Bugeti · Smart budgeting for everyone
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });
}
