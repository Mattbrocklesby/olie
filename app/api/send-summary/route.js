// app/api/send-summary/route.js
// Requires: npm install resend
// Add RESEND_API_KEY to your .env.local and Vercel environment variables
// Sign up at resend.com — free tier sends 3,000 emails/month
// You must verify a sending domain in your Resend dashboard
// Then update FROM_ADDRESS below to an address on your verified domain

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = "OLIE <olie@opalbusiness.co.uk>";

function buildYoungPersonEmail(profile, summary, transcript) {
  const name = profile.youngPersonName || "there";
  return {
    subject: `Your OLIE session — ${summary.pattern}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #2C3E38;">
        <div style="background: #E8F2EF; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <h1 style="font-size: 20px; font-weight: 500; margin: 0 0 8px; color: #4A8C8C;">Your session summary</h1>
          <p style="margin: 0; color: #5C6E68; font-size: 14px;">Well done for taking the time to look at this, ${name}.</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: #8A9E98; margin: 0 0 4px;">Pattern identified</p>
          <p style="font-size: 18px; font-weight: 500; color: #4A8C8C; margin: 0 0 4px;">${summary.pattern}</p>
          <p style="font-size: 12px; color: #8A9E98; margin: 0 0 14px;">${summary.clinical}</p>
          <p style="font-size: 14px; line-height: 1.7; color: #2C3E38; margin: 0 0 14px;">${summary.explanation}</p>
        </div>

        <div style="background: #E8F2EF; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: #8A9E98; margin: 0 0 6px;">Suggested response</p>
          <p style="font-size: 14px; line-height: 1.7; color: #2C3E38; margin: 0;">${summary.erp}</p>
        </div>

        <p style="font-size: 13px; color: #8A9E98; font-style: italic; margin: 0 0 24px;">Discomfort is not danger. Uncertainty is not the same as threat.</p>

        <div style="border-top: 1px solid #E8E0D0; padding-top: 16px;">
          <p style="font-size: 12px; color: #8A9E98; line-height: 1.6; margin: 0;">
            OLIE is a psychoeducation tool — not therapy or diagnosis. A therapist trained in ERP or CBT-OCD is the most effective support for OCD.<br><br>
            Crisis support: <strong>Samaritans 116 123</strong> · Text SHOUT to <strong>85258</strong>
          </p>
        </div>
      </div>
    `
  };
}

function buildCarerEmail(profile, summary, transcript) {
  const name = profile.youngPersonName || "your young person";
  const carerName = profile.carerName || "there";
  return {
    subject: `OLIE session summary for ${name}`,
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #2C3E38;">
        <div style="background: #E8F2EF; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
          <h1 style="font-size: 20px; font-weight: 500; margin: 0 0 8px; color: #4A8C8C;">Session summary — ${name}</h1>
          <p style="margin: 0; color: #5C6E68; font-size: 14px;">Hi ${carerName}. ${name} completed a session with OLIE and chose to share this summary with you.</p>
        </div>

        <div style="margin-bottom: 20px;">
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: #8A9E98; margin: 0 0 4px;">Pattern identified</p>
          <p style="font-size: 18px; font-weight: 500; color: #4A8C8C; margin: 0 0 4px;">${summary.pattern}</p>
          <p style="font-size: 12px; color: #8A9E98; margin: 0 0 14px;">${summary.clinical}</p>
          <p style="font-size: 14px; line-height: 1.7; color: #2C3E38; margin: 0 0 14px;">${summary.explanation}</p>
        </div>

        <div style="background: #E8F2EF; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.07em; color: #8A9E98; margin: 0 0 6px;">Suggested response for ${name}</p>
          <p style="font-size: 14px; line-height: 1.7; color: #2C3E38; margin: 0;">${summary.erp}</p>
        </div>

        <div style="background: #FFF8F0; border: 1px solid #E8E0D0; border-radius: 8px; padding: 14px; margin-bottom: 20px;">
          <p style="font-size: 13px; font-weight: 500; color: #2C3E38; margin: 0 0 6px;">A note for carers</p>
          <p style="font-size: 13px; line-height: 1.7; color: #5C6E68; margin: 0;">
            The most supportive thing you can do is avoid providing reassurance about the content of the thought — this is hard, but it is what ERP asks of those around the person.
            If ${name} asks you to confirm their fears aren't real, gently acknowledge how uncomfortable this feels without confirming or denying: <em>"I can hear how hard that feels. I'm not going to answer that one — but I'm here."</em>
          </p>
        </div>

        <div style="border-top: 1px solid #E8E0D0; padding-top: 16px;">
          <p style="font-size: 12px; color: #8A9E98; line-height: 1.6; margin: 0;">
            OLIE is a psychoeducation tool — not therapy or diagnosis. A therapist trained in ERP or CBT-OCD is the most effective support.
            If you are concerned about ${name}'s wellbeing, please contact your GP or a mental health professional.<br><br>
            Crisis support: <strong>Samaritans 116 123</strong> · Text SHOUT to <strong>85258</strong> · A&E for immediate risk
          </p>
        </div>
      </div>
    `
  };
}

export async function POST(request) {
  try {
    const { profile, summary, transcript, category } = await request.json();
    const sends = [];

    if (profile.youngPersonEmail) {
      const { subject, html } = buildYoungPersonEmail(profile, summary, transcript);
      sends.push(resend.emails.send({
        from: FROM_ADDRESS,
        to: profile.youngPersonEmail,
        subject,
        html,
      }));
    }

    if (profile.carerEmail) {
      const { subject, html } = buildCarerEmail(profile, summary, transcript);
      sends.push(resend.emails.send({
        from: FROM_ADDRESS,
        to: profile.carerEmail,
        subject,
        html,
      }));
    }

    await Promise.all(sends);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Email send error:", err);
    return Response.json({ error: "Failed to send" }, { status: 500 });
  }
}
