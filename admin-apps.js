'use strict';
// Applications tab: review submissions from the website's Get Involved forms. Uses globals from admin.js.
const appStyle = document.createElement('style');
appStyle.textContent = `
  .app-list { display: grid; gap: 12px; }
  .app-card { padding: 18px 20px; border-radius: 16px; background: #fff; border: 1px solid var(--rule); }
  .app-card.is-new { border-left: 5px solid var(--gold); }
  .app-head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
  .app-head h3 { font-size: 1.1rem; margin-right: auto; }
  .app-form { padding: 3px 10px; border-radius: 100px; background: var(--sky); color: var(--navy); font-weight: 800; font-size: .76rem; }
  .app-status { padding: 3px 10px; border-radius: 100px; font-weight: 800; font-size: .76rem; text-transform: uppercase; letter-spacing: .04em; }
  .st-new { background: var(--sand); color: #9a5a00; } .st-reviewing { background: #e8eefb; color: var(--navy); }
  .st-accepted { background: #e6f6ec; color: #17663a; } .st-declined { background: #fde8e6; color: var(--red); } .st-archived { background: #eee; color: #666; }
  .app-meta { margin-top: 4px; font-size: .84rem; color: var(--muted); }
  .app-fields { display: grid; grid-template-columns: 220px 1fr; gap: 6px 14px; margin: 14px 0 0; font-size: .92rem; }
  .app-fields dt { font-weight: 700; color: var(--navy); }
  .app-fields dd { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
  .app-actions { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 14px; }
  .app-actions .btn[aria-pressed="true"] { background: var(--navy); color: #fff; border-color: var(--navy); }
  .app-note { width: 100%; margin-top: 10px; padding: 10px 12px; border: 1.5px solid var(--rule); border-radius: 10px; background: var(--cream); font-size: .9rem; min-height: 60px; }
  .app-card details summary { cursor: pointer; color: var(--navy); font-weight: 700; margin-top: 10px; }
  @media (max-width: 700px) { .app-fields { grid-template-columns: 1fr; } }
`;
document.head.append(appStyle);

const appForms = window.LUMEN_CONTENT.applications || [];
const formTitle = id => appForms.find(f => f.id === id)?.title || id;
const fieldLabel = (form, name) => appForms.find(f => f.id === form)?.fields.find(x => x.name === name)?.label || name;
const STATUS = [['new', 'New'], ['reviewing', 'Reviewing'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['archived', 'Archived']];
let apps = null, appAlerts = null, appFilter = {form: 'all', status: 'active'};

views.applications = () => {
  queueMicrotask(loadApps);
  return `<div class="intro"><div><h2>Applications</h2><p>Everything submitted through the <b>Get Involved</b> forms on the website: schools and communities, partners, ambassadors, volunteers and visit requests. Set a status, add private notes, and reply by email. Applications are kept permanently and can't be deleted from here. Use <b>Archived</b> to tidy up.</p></div>
    <button class="btn" data-apps="csv">⬇ Download spreadsheet (CSV)</button></div>
    <div id="apps-root"><p class="empty-note">Loading applications…</p></div>`;
};
async function loadApps() {
  const root = document.querySelector('#apps-root');
  if (!root) return;
  try {
    const out = await api('/api/applications');
    apps = out.applications.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    appAlerts = out.alerts || null;
    updateAppBadge(); drawApps();
  } catch (e) { root.innerHTML = typeof setupHelp === 'function' ? setupHelp('Applications', e.message) : `<p>${esc(e.message)}</p>`; }
}
function updateAppBadge() {
  const n = (apps || []).filter(a => a.status === 'new').length;
  const el = document.querySelector('#count-applications');
  if (el) { el.textContent = n || ''; el.hidden = !n; }
}
function drawApps() {
  const root = document.querySelector('#apps-root');
  if (!root || !apps) return;
  const shown = apps.filter(a => (appFilter.form === 'all' || a.form === appFilter.form) &&
    (appFilter.status === 'all' || (appFilter.status === 'active' ? a.status !== 'archived' : a.status === appFilter.status)));
  const countFor = id => apps.filter(a => a.form === id && a.status !== 'archived').length;
  root.innerHTML = alertBar() + `<div class="ins-bar">${[['all', `All forms (${apps.filter(a => a.status !== 'archived').length})`], ...appForms.map(f => [f.id, `${f.title} (${countFor(f.id)})`])].map(([k, l]) => `<button class="chip-btn" data-appform="${esc(k)}" aria-pressed="${appFilter.form === k}">${esc(l)}</button>`).join('')}</div>
    <div class="ins-bar">${[['active', 'Not archived'], ...STATUS, ['all', 'Everything']].map(([k, l]) => `<button class="chip-btn" data-appstatus="${k}" aria-pressed="${appFilter.status === k}">${l}</button>`).join('')}</div>
    <div class="app-list">${shown.map(a => {
      const f = a.fields || {}, when = new Date(a.submittedAt);
      const place = [a.city, a.region, a.country].filter(Boolean).join(', ');
      return `<article class="app-card${a.status === 'new' ? ' is-new' : ''}">
        <div class="app-head"><span class="app-form">${esc(formTitle(a.form))}</span><h3>${esc(f.name || 'No name')}${f.school || f.organization ? ` · ${esc(f.school || f.organization)}` : ''}</h3><span class="app-status st-${esc(a.status)}">${esc(a.status)}</span></div>
        <div class="app-meta">Submitted ${esc(when.toLocaleString())}${place ? ` · from ${esc(place)}` : ''}${a.updatedBy ? ` · last updated by ${esc(a.updatedBy)}` : ''}${a.alert && a.alert !== 'off' ? ` · email alert ${esc(a.alert)}` : ''}</div>
        <dl class="app-fields">${Object.entries(f).map(([k, v]) => `<dt>${esc(fieldLabel(a.form, k))}</dt><dd>${k === 'email' ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : /^https?:\/\//.test(v) ? `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(v)}</a>` : esc(v)}</dd>`).join('')}</dl>
        <div class="app-actions">${STATUS.map(([k, l]) => `<button class="btn small" data-appset="${k}" data-id="${esc(a.id)}" aria-pressed="${a.status === k}">${l}</button>`).join('')}
          ${f.email ? `<a class="btn small primary" href="mailto:${esc(f.email)}?subject=${encodeURIComponent('Your Project Lumin application: ' + formTitle(a.form))}">✉ Reply by email</a>` : ''}</div>
        <details${a.note ? ' open' : ''}><summary>Private notes${a.note ? '' : ' (only admins see these)'}</summary><textarea class="app-note" data-appnote="${esc(a.id)}" placeholder="Notes for your team…">${esc(a.note || '')}</textarea><button class="btn small" data-appsavenote="${esc(a.id)}">Save note</button></details>
      </article>`;
    }).join('') || '<div class="empty">No applications here yet. When someone submits a form on the website, it shows up here.</div>'}</div>`;
}
async function setApp(id, patch) {
  try {
    const {application} = await api('/api/applications', {method: 'POST', body: JSON.stringify({id, ...patch})});
    apps = apps.map(a => a.id === id ? application : a);
    updateAppBadge(); drawApps();
    setStatus(patch.note !== undefined ? 'Note saved ✓' : `Marked ${application.status} ✓`);
  } catch (e) { setStatus("Couldn't update: " + e.message, 'error'); }
}
function alertBar() {
  const a = appAlerts;
  if (!a) return '';
  if (a.local) return '<p class="note-live">📧 Email alerts work on the live site (not on this computer).</p>';
  if (a.on) return `<div class="note-live" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">📧 <span style="margin-right:auto">Email alerts are <b>on</b>. New applications are emailed to <b>${esc(a.to.join(', '))}</b>.</span><button class="btn small" data-apps="test-email">Send test email</button></div>`;
  return `<div class="note-live">📧 <b>Email alerts are off.</b> To get an email for every new application: create a free account at <b>resend.com</b> (sign up with the address that should get the alerts), create an API key, then in Vercel → Settings → Environment Variables add <code>RESEND_API_KEY</code> (the key) and <code>ALERT_EMAIL</code> (that address), and redeploy.</div>`;
}
async function sendTestEmail(btn) {
  btn.disabled = true; setStatus('Sending test email…', 'saving');
  try { const r = await api('/api/applications', {method: 'POST', body: JSON.stringify({action: 'test-email'})}); setStatus('Test email sent to ' + r.to.join(', ') + ' ✓'); }
  catch (e) { setStatus("Test email failed: " + e.message, 'error'); }
  btn.disabled = false;
}
function downloadCsv() {
  if (!apps) return;
  fetch('/api/history', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({what: `Applications · downloaded spreadsheet (${apps.length} applications)`})}).catch(() => {});
  const keys = [...new Set(apps.flatMap(a => Object.keys(a.fields || {})))];
  const head = ['Submitted', 'Form', 'Status', ...keys.map(k => k), 'Notes'];
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = apps.map(a => [a.submittedAt, formTitle(a.form), a.status, ...keys.map(k => a.fields?.[k] || ''), a.note || ''].map(q).join(','));
  const blob = new Blob([[head.map(q).join(','), ...rows].join('\n')], {type: 'text/csv'});
  Object.assign(document.createElement('a'), {href: URL.createObjectURL(blob), download: `project-lumin-applications-${new Date().toISOString().slice(0, 10)}.csv`}).click();
}
document.addEventListener('click', e => {
  const t = e.target;
  const f = t.closest('[data-appform]'); if (f) { appFilter.form = f.dataset.appform; drawApps(); }
  const s = t.closest('[data-appstatus]'); if (s) { appFilter.status = s.dataset.appstatus; drawApps(); }
  const set = t.closest('[data-appset]'); if (set) setApp(set.dataset.id, {status: set.dataset.appset});
  const sn = t.closest('[data-appsavenote]'); if (sn) setApp(sn.dataset.appsavenote, {note: document.querySelector(`[data-appnote="${sn.dataset.appsavenote}"]`).value});
  if (t.closest('[data-apps="csv"]')) downloadCsv();
  const te = t.closest('[data-apps="test-email"]'); if (te) sendTestEmail(te);
});
// Show the number of new applications on the tab as soon as the admin opens.
setTimeout(async () => { try { if (window.adminSession?.loggedIn !== false) { apps = (await api('/api/applications')).applications; updateAppBadge(); } } catch {} }, 1500);
