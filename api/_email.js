// Email alerts for new applications, sent through Resend (https://resend.com).
// Vercel environment variables:
//   RESEND_API_KEY  API key from Resend (required)
//   ALERT_EMAIL     who gets the alerts; several addresses can be separated by commas (required)
//   ALERT_FROM      sender, e.g. "Project Lumin <alerts@yourdomain.org>" (optional; needs a domain verified in Resend).
//                   Without it, Resend's test sender is used, which can only email the address you signed up to Resend with.
const FORM_TITLES = {network: 'Add Your School or Community to Our Network', partner: 'Partner With Us', ambassador: 'Become an Ambassador', volunteer: 'Volunteer at an Event', visit: 'Request a Visit or Booth'};
const LABELS = {name: 'Name', email: 'Email', phone: 'Phone', school: 'School / community', organization: 'Organization', location: 'Location', kind: 'Type', role: 'Role', size: 'Size', photo: 'Photo link', notes: 'Notes', website: 'Website', orgType: 'Organization type', how: 'How they want to partner', details: 'Details', grade: 'Grade', social: 'Social media', why: 'Why', ideas: 'Ideas', time: 'Time per month', interest: 'Wants to help with', availability: 'Availability', hours: 'Needs volunteer hours', date: 'Preferred date', audience: 'Expected audience'};

const recipients = () => String(process.env.ALERT_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
const emailReady = () => Boolean(process.env.RESEND_API_KEY && recipients().length);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

async function sendEmail({subject, html, text, replyTo}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({from: process.env.ALERT_FROM || 'Project Lumin Alerts <onboarding@resend.dev>', to: recipients(), subject, html, text, ...(replyTo ? {reply_to: replyTo} : {})})
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(out.message || out.error || `Email service error ${res.status}`);
  return out;
}

function applicationEmail(app, siteUrl) {
  const title = FORM_TITLES[app.form] || app.form;
  const f = app.fields || {};
  const rows = Object.entries(f).map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#4f5b78;font-weight:600;vertical-align:top;white-space:nowrap">${esc(LABELS[k] || k)}</td><td style="padding:6px 0;color:#142449;white-space:pre-wrap">${esc(v)}</td></tr>`).join('');
  const place = [app.city, app.region, app.country].filter(Boolean).join(', ');
  const who = f.name || 'Someone';
  return {
    subject: `New application: ${title} from ${who}`,
    replyTo: f.email,
    text: `New "${title}" application\n\n${Object.entries(f).map(([k, v]) => `${LABELS[k] || k}: ${v}`).join('\n')}\n\nReview it in the admin: ${siteUrl}/admin`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#142449">
      <div style="background:#16326d;color:#fff;padding:18px 22px;border-radius:14px 14px 0 0"><div style="font-size:13px;color:#ffd38c;font-weight:700;letter-spacing:.06em;text-transform:uppercase">New application</div><div style="font-size:22px;font-weight:800;margin-top:4px">${esc(title)}</div></div>
      <div style="border:1px solid #e7e3dc;border-top:0;padding:18px 22px;border-radius:0 0 14px 14px;background:#fff9f3">
        <p style="margin:0 0 12px">${esc(who)} just applied on the Project Lumin website${place ? ` (from ${esc(place)})` : ''}.</p>
        <table style="border-collapse:collapse;font-size:14px">${rows}</table>
        <p style="margin:18px 0 0"><a href="${esc(siteUrl)}/admin" style="background:#f4a730;color:#0d2150;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:700">Review in the admin</a></p>
        <p style="margin:14px 0 0;font-size:12px;color:#4f5b78">Reply to this email to answer ${esc(who)} directly.</p>
      </div></div>`
  };
}

module.exports = {emailReady, recipients, sendEmail, applicationEmail};
