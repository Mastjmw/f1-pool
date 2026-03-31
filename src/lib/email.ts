import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "F1 Pool <onboarding@resend.dev>";
const BASE_URL = process.env.NEXTAUTH_URL || "https://f1-pool.vercel.app";

export async function sendVerificationEmail(to: string, name: string, token: string) {
  const url = `${BASE_URL}/verify?token=${token}`;

  if (!resend) {
    console.log(`[EMAIL STUB] Verification to ${to}: ${url}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "🏎️ Verify your F1 Pool account",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444;">🏎️ F1 Pool — Verify Your Email</h2>
        <p>Hey ${name},</p>
        <p>Click the button below to verify your email and activate your account:</p>
        <p style="margin: 24px 0;">
          <a href="${url}" style="background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Verify Email
          </a>
        </p>
        <p style="color: #888; font-size: 12px;">This link expires in 1 hour. If you didn't create this account, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const url = `${BASE_URL}/reset-password?token=${token}`;

  if (!resend) {
    console.log(`[EMAIL STUB] Password reset to ${to}: ${url}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "🏎️ Reset your F1 Pool password",
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444;">🏎️ F1 Pool — Password Reset</h2>
        <p>Hey ${name},</p>
        <p>Click the button below to reset your password:</p>
        <p style="margin: 24px 0;">
          <a href="${url}" style="background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Reset Password
          </a>
        </p>
        <p style="color: #888; font-size: 12px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPickReminder(
  to: string,
  name: string,
  raceName: string,
  round: number,
  deadline: Date,
  poolName: string
) {
  if (!resend) {
    console.log(`[EMAIL STUB] Pick reminder to ${to} for ${raceName}`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `🏎️ Pick reminder: ${raceName} (R${round})`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444;">🏎️ F1 Pool — Pick Reminder</h2>
        <p>Hey ${name},</p>
        <p>Don't forget to submit your pick for <strong>Round ${round}: ${raceName}</strong> in <strong>${poolName}</strong>!</p>
        <p>⏰ <strong>Deadline:</strong> ${deadline.toLocaleString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        })}</p>
        <p style="margin-top: 20px;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard" 
             style="background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Make Your Pick
          </a>
        </p>
        <p style="color: #888; font-size: 12px; margin-top: 30px;">
          Remember: once you pick a driver, you can't pick them again this season!
        </p>
      </div>
    `,
  });
}

export async function sendResultsSummary(
  to: string,
  name: string,
  raceName: string,
  round: number,
  driverPicked: string,
  pointsEarned: number,
  newTotal: number,
  rank: number,
  poolName: string
) {
  if (!resend) {
    console.log(`[EMAIL STUB] Results to ${to}: ${driverPicked} scored ${pointsEarned} pts`);
    return;
  }

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `🏁 R${round} Results: ${driverPicked} scored ${pointsEarned} pts`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #ef4444;">🏁 Race Results — ${raceName}</h2>
        <p>Hey ${name},</p>
        <p>Here's how you did in <strong>${poolName}</strong>:</p>
        <div style="background: #1a1a2e; padding: 16px; border-radius: 8px; color: white; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Your pick:</strong> ${driverPicked}</p>
          <p style="margin: 4px 0;"><strong>Points earned:</strong> ${pointsEarned}</p>
          <p style="margin: 4px 0;"><strong>Season total:</strong> ${newTotal} pts</p>
          <p style="margin: 4px 0;"><strong>Current rank:</strong> #${rank}</p>
        </div>
        <p>
          <a href="${process.env.NEXTAUTH_URL}/dashboard"
             style="background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Full Standings
          </a>
        </p>
      </div>
    `,
  });
}
