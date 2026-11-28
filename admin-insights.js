'use strict';
// History and Analytics tabs for the admin panel. Uses globals from admin.js (views, panel, esc, api, tab, mode).

const insightStyle = document.createElement('style');
insightStyle.textContent = `
  .ins-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 16px; }
  .ins-bar .note { margin-right: auto; color: var(--muted); font-size: .9rem; }
  .chip-btn { min-height: 36px; padding: 0 14px; border-radius: 100px; border: 1.5px solid #16326d33; background: #fff; font-weight: 700; color: var(--navy); font-size: .86rem; }
  .chip-btn[aria-pressed="true"] { background: var(--navy); color: #fff; border-color: var(--navy); }
  .seal { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 100px; font-weight: 700; font-size: .84rem; }
  .seal.ok { background: #e6f6ec; color: #17663a; } .seal.bad { background: #fde8e6; color: var(--red); }
  .hist { display: grid; gap: 10px; }
  .hist-item { display: grid; grid-template-columns: 150px 1fr; gap: 14px; padding: 14px 16px; border-radius: 14px; background: #fff; border: 1px solid var(--rule); }
  .hist-item.tampered { border-color: var(--red); background: #fff7f6; }
  .hist-time { font-size: .84rem; color: var(--muted); line-height: 1.35; }
  .hist-time b { display: block; color: var(--navy); font-size: .9rem; }
  .hist-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .hist-head strong { color: var(--navy); }
  .tag-type { padding: 2px 10px; border-radius: 100px; font-size: .74rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; background: var(--sky); color: var(--navy); }
  .tag-type.t-login { background: #e6f6ec; color: #17663a; } .tag-type.t-login-failed { background: #fde8e6; color: var(--red); }
  .tag-type.t-publish { background: var(--sand); color: #9a5a00; } .tag-type.t-upload { background: #efe8fb; color: #5b3aa0; }
  .hist-meta { margin-top: 4px; font-size: .82rem; color: var(--muted); }
  .hist-changes { margin: 8px 0 0; padding-left: 18px; font-size: .88rem; color: var(--ink); }
  .hist-changes li { margin: 2px 0; overflow-wrap: anywhere; }
  .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
  .kpi { padding: 18px; border-radius: 16px; background: #fff; border: 1px solid var(--rule); }
  .kpi b { display: block; font: 800 2rem/1 Outfit, sans-serif; color: var(--navy); }
  .kpi span { color: var(--muted); font-weight: 600; font-size: .88rem; }
  .ins-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .ins-card { padding: 18px; border-radius: 16px; background: #fff; border: 1px solid var(--rule); }
  .ins-card.wide { grid-column: 1 / -1; }
  .ins-card h3 { font-size: 1.05rem; margin-bottom: 12px; }
  .daily { display: flex; align-items: flex-end; gap: 4px; height: 170px; padding-top: 10px; }
  .daily .col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; min-width: 0; }
  .daily .bar { width: 100%; max-width: 38px; border-radius: 6px 6px 2px 2px; background: var(--navy); position: relative; min-height: 2px; }
  .daily .bar.pv { background: var(--gold); }
  .daily .pair { display: flex; align-items: flex-end; gap: 2px; width: 100%; flex: 1; min-height: 0; justify-content: center; }
  .daily .pair .bar { width: 45%; }
  .daily small { font-size: .66rem; color: var(--muted); white-space: nowrap; }
  .legend { display: flex; gap: 14px; font-size: .82rem; color: var(--muted); margin-top: 8px; }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
  .rlist { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
  .rlist li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; font-size: .9rem; }
  .rlist .lbl { position: relative; padding: 6px 10px; border-radius: 8px; overflow: hidden; overflow-wrap: anywhere; }
  .rlist .lbl::before { content: ""; position: absolute; inset: 0; width: var(--w); background: var(--sky); z-index: 0; border-radius: 8px; }
  .rlist .lbl span { position: relative; }
  .rlist b { color: var(--navy); }
  .feed { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: 420px; overflow: auto; font-size: .86rem; }
  .feed li { display: grid; grid-template-columns: 90px 70px minmax(0, 1fr); gap: 10px; padding: 6px 4px; border-bottom: 1px solid var(--rule); }
  .feed time { color: var(--muted); }
  .empty-note { color: var(--muted); font-size: .9rem; }
  .setup { padding: 22px; border-radius: 16px; background: #fff; border: 1px solid var(--rule); line-height: 1.6; }
  .setup ol { padding-left: 20px; }
  @media (max-width: 800px) { .kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ins-grid { grid-template-columns: 1fr; } .hist-item { grid-template-columns: 1fr; } }
`;
document.head.append(insightStyle);

const fmtTime = t => { const d = new Date(t); return {date: d.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'}), time: d.toLocaleTimeString(undefined, {hour: 'numeric', minute: '2-digit', second: '2-digit'})}; };
function device(ua = '') {
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /CrOS/.test(ua) ? 'Chromebook' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'Unknown device';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return br ? `${br} on ${os}` : os;
}
const place = e => [e.city, e.region, e.country].filter(Boolean).join(', ') || (mode === 'local' ? 'This computer' : 'Unknown location');
function storageStatus() {
  const st = window.adminSession?.storage;
  if (!st) return '';
  const names = st.settings?.length ? st.settings.map(n => `<code>${esc(n)}</code>`).join(', ') : '<b>none</b>';
  return `<p style="margin-top:12px;padding:12px 14px;border-radius:12px;background:var(--sky);font-size:.9rem"><b>Connection check:</b> ${st.ok ? 'connected ✓' : esc(st.error || 'not working')}<br>Storage settings this deployment can see: ${names}</p>`;
}
const setupHelp = (what, err = '') => `<div class="setup"><h3>${what} isn't connected yet</h3>
  ${err && !/not connected/i.test(err) ? `<p><b>Error:</b> ${esc(err)}</p>` : ''}
  <p>The live site needs a free Redis database to keep the ${what.toLowerCase()} permanently. Either kind works: <b>Upstash for Redis</b> or Vercel's <b>Redis</b> integration.</p>
  <ol><li>In <b>Vercel</b> → your project → <b>Storage</b>, make sure the database shows as <b>connected to this project</b> (for Production).</li>
  <li>Then <b>Deployments → ⋯ → Redeploy</b>. New settings only reach the site after a redeploy.</li></ol>
  ${storageStatus()}</div>`;

/* ---------- History ---------- */
const typeLabel = t => ({login: 'Logged in', 'login-failed': 'Failed login', logout: 'Logged out', publish: mode === 'local' ? 'Saved changes' : 'Published', upload: 'Uploaded image', view: 'Opened', application: 'New application', 'application-update': 'Updated application', 'email-test': 'Test email'}[t] || t);
let histFilter = 'all', histEntries = [], histTotal = 0;
views.history = () => {
  queueMicrotask(() => loadHistory(true));
  return `<div class="intro"><div><h2>History</h2><p>Every login (with IP address and location), failed login, upload, published change, and section opened in this admin panel. <b>Entries can't be edited or deleted from here.</b> Each one is sealed to the one before it, so any outside tampering shows up as a red warning.</p></div></div>
    <div id="history-root"><p class="empty-note">Loading history…</p></div>`;
};
async function loadHistory(reset) {
  const root = document.querySelector('#history-root');
  if (!root) return;
  try {
    const out = await api('/api/history?start=' + (reset ? 0 : histEntries.length));
    histEntries = reset ? out.entries : [...histEntries, ...out.entries];
    histTotal = out.total;
    drawHistory();
  } catch (e) { root.innerHTML = setupHelp('History', e.message); }
}
function drawHistory() {
  const root = document.querySelector('#history-root');
  if (!root) return;
  const groups = {all: () => true, logins: e => /login|logout/.test(e.type), changes: e => e.type === 'publish', uploads: e => e.type === 'upload', apps: e => /^application/.test(e.type), views: e => e.type === 'view', failed: e => e.type === 'login-failed'};
  const shown = histEntries.filter(groups[histFilter]);
  const intact = histEntries.every(e => e.ok);
  root.innerHTML = `<div class="ins-bar"><span class="note">${histTotal} entries recorded</span>
      <span class="seal ${intact ? 'ok' : 'bad'}">${intact ? '✓ History intact' : '⚠ Tampering detected'}</span></div>
    <div class="ins-bar">${[['all', 'Everything'], ['logins', 'Logins'], ['failed', 'Failed logins'], ['changes', 'Changes'], ['uploads', 'Uploads'], ['apps', 'Applications'], ['views', 'Sections opened']].map(([k, l]) => `<button class="chip-btn" data-hfilter="${k}" aria-pressed="${histFilter === k}">${l}</button>`).join('')}</div>
    <div class="hist">${shown.map(e => { const t = fmtTime(e.t); return `<article class="hist-item${e.ok ? '' : ' tampered'}">
      <div class="hist-time"><b>${esc(t.time)}</b>${esc(t.date)}</div>
      <div><div class="hist-head"><span class="tag-type t-${esc(e.type)}">${esc(typeLabel(e.type))}</span><strong>${esc(e.who || 'Unknown')}</strong>${e.what ? `<span>· ${esc(e.what)}</span>` : ''}${e.file ? `<span>· ${esc(e.original || e.file)}</span>` : ''}${e.ok ? '' : '<span class="tag-type t-login-failed">Altered</span>'}</div>
        <div class="hist-meta">${esc(place(e))} · IP ${esc(e.ip || 'unknown')} · ${esc(device(e.ua))}${e.commit ? ` · change ${esc(e.commit.slice(0, 7))}` : ''}</div>
        ${e.changes?.length ? `<ul class="hist-changes">${e.changes.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}</div></article>`; }).join('') || '<p class="empty-note">Nothing here yet.</p>'}</div>
    ${histEntries.length < histTotal ? '<div class="ins-bar" style="justify-content:center;margin-top:16px"><button class="btn" data-hmore>Load older entries</button></div>' : ''}`;
}
document.addEventListener('click', e => {
  const f = e.target.closest('[data-hfilter]');
  if (f) { histFilter = f.dataset.hfilter; drawHistory(); }
  if (e.target.closest('[data-hmore]')) loadHistory(false);
});

/* ---------- Analytics ---------- */
let anaDays = 7;
views.analytics = () => {
  queueMicrotask(loadAnalytics);
  return `<div class="intro"><div><h2>Analytics</h2><p>How many people visit the website, which pages they look at, what they click, and where they come from. Visitors stay anonymous: no names, cookies, or visitor IP addresses are stored.</p></div>
    <div class="ins-bar">${[7, 30, 90].map(n => `<button class="chip-btn" data-days="${n}" aria-pressed="${anaDays === n}">Last ${n} days</button>`).join('')}<button class="btn small" data-arefresh>↻ Refresh</button></div></div>
    <div id="analytics-root"><p class="empty-note">Loading analytics…</p></div>`;
};
const rankList = (rows, fmt = x => x) => {
  if (!rows.length) return '<p class="empty-note">No data yet.</p>';
  const max = rows[0][1] || 1;
  return `<ul class="rlist">${rows.map(([k, v]) => `<li><span class="lbl" style="--w:${(v / max * 100).toFixed(1)}%"><span>${esc(fmt(k))}</span></span><b>${v}</b></li>`).join('')}</ul>`;
};
const pageName = p => ({'/': 'Home', '/about': 'About', '/blog': 'Blog', '/impact': 'Impact', '/partnerships': 'Partnerships', '/contact': 'Contact'}[p] || p);
async function loadAnalytics() {
  const root = document.querySelector('#analytics-root');
  if (!root) return;
  try {
    const a = await api('/api/analytics?days=' + anaDays);
    const maxDay = Math.max(1, ...a.daily.map(d => Math.max(d.visitors, d.pageviews)));
    const label = d => new Date(d + 'T12:00:00').toLocaleDateString(undefined, anaDays > 7 ? {month: 'numeric', day: 'numeric'} : {weekday: 'short'});
    const every = anaDays > 30 ? 7 : anaDays > 7 ? 3 : 1;
    root.innerHTML = `<div class="kpis">
        <div class="kpi"><b>${a.totals.visitors}</b><span>Visitors</span></div>
        <div class="kpi"><b>${a.totals.pageviews}</b><span>Page views</span></div>
        <div class="kpi"><b>${a.totals.pagesPerVisitor}</b><span>Pages per visitor</span></div>
        <div class="kpi"><b>${a.totals.clicks}</b><span>Clicks</span></div></div>
      <div class="ins-grid">
        <div class="ins-card wide"><h3>Visitors per day</h3>
          <div class="daily">${a.daily.map((d, i) => `<div class="col" title="${esc(d.date)}: ${d.visitors} visitors, ${d.pageviews} page views"><div class="pair"><div class="bar" style="height:${d.visitors / maxDay * 100}%"></div><div class="bar pv" style="height:${d.pageviews / maxDay * 100}%"></div></div><small>${i % every === 0 ? esc(label(d.date)) : ''}</small></div>`).join('')}</div>
          <div class="legend"><span><i style="background:var(--navy)"></i>Visitors</span><span><i style="background:var(--gold)"></i>Page views</span></div></div>
        <div class="ins-card"><h3>Most viewed pages</h3>${rankList(a.pages, pageName)}</div>
        <div class="ins-card"><h3>Most clicked</h3>${rankList(a.clicks)}</div>
        <div class="ins-card"><h3>Where visitors come from</h3>${rankList(a.referrers.length ? a.referrers : [], r => r)}${a.referrers.length ? '' : '<p class="empty-note">Visits from links on other websites show up here. Direct visits aren\'t listed.</p>'}</div>
        <div class="ins-card"><h3>Countries</h3>${rankList(a.countries)}</div>
        <div class="ins-card"><h3>Devices</h3>${rankList(a.devices)}</div>
        <div class="ins-card"><h3>Latest activity</h3>${a.events.length ? `<ul class="feed">${a.events.map(ev => `<li><time>${esc(fmtTime(ev.t).time)}</time><span>${ev.type === 'click' ? 'Click' : 'View'}</span><span>${ev.type === 'click' ? `"${esc(ev.label)}" on ${esc(pageName(ev.path))}` : esc(pageName(ev.path))}${ev.city || ev.country ? ` · ${esc([ev.city, ev.country].filter(Boolean).join(', '))}` : ''}${ev.dev ? ` · ${esc(ev.dev)}` : ''}</span></li>`).join('')}</ul>` : '<p class="empty-note">No visits yet.</p>'}</div>
      </div>`;
  } catch (e) { root.innerHTML = setupHelp('Analytics', e.message); }
}
document.addEventListener('click', e => {
  const d = e.target.closest('[data-days]');
  if (d) { anaDays = Number(d.dataset.days); document.querySelectorAll('[data-days]').forEach(b => b.setAttribute('aria-pressed', String(b === d))); loadAnalytics(); }
  if (e.target.closest('[data-arefresh]')) loadAnalytics();
});
