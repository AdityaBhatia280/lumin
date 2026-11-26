'use strict';

const content = window.LUMEN_CONTENT;
const data = window.LUMIN_DATA || {settings: {}, photos: [], slots: {}, partners: [], posts: []};
const network = window.LUMEN_NETWORK || [];
const main = document.querySelector('main');

// Retired pages forward to where their content lives now.
const moved = {'/our-work': '/blog', '/youth-ambassadors': '/', '/digital-hub': '/', '/network': '/impact', '/chapters': '/impact', '/partners': '/partnerships', '/partners.html': '/partnerships'};
let route = location.pathname.replace(/\/$/, '') || '/';
if (route.startsWith('/our-work/')) route = '/our-work';
if (moved[route]) location.replace(moved[route] + location.hash);

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
const arrow = '<span class="arrow" aria-hidden="true">↗</span>';
const button = (text, url, style = 'primary') => `<a class="button ${style}" href="${esc(url)}">${esc(text)} ${arrow}</a>`;
const textLink = (text, url) => `<a class="text-link" href="${esc(url)}">${esc(text)} ${arrow}</a>`;
const email = data.settings?.email || 'projectluminfrisco@gmail.com';
const instagram = data.settings?.instagram || '';
const linkedin = data.settings?.linkedin || '';
const mail = (subject = '') => 'mailto:' + email + (subject ? '?subject=' + encodeURIComponent(subject) : '');
const section = (body, cls = '', id = '') => `<section class="section ${cls}"${id ? ` id="${id}"` : ''}><div class="wrap">${body}</div></section>`;
const heading = (eyebrow, title, lead = '', action = '') => `<div class="section-head" data-reveal><div>${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}<h2>${title}</h2>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}</div>${action}</div>`;
const linkedinIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3.5"/><path class="dot" d="M7.2 10h2.2v7H7.2zM8.3 6.6a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5zM11 10h2.1v1c.4-.7 1.2-1.2 2.4-1.2 2.1 0 2.6 1.4 2.6 3.2v4h-2.2v-3.6c0-.9-.2-1.7-1.2-1.7s-1.5.7-1.5 1.7V17H11z"/></svg>';
const instagramIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" class="dot"/></svg>';

/* ---------- Photos: pinned spots first, everything else shuffled across the site ---------- */
function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
const photos = (data.photos || []).filter(p => p && p.src);
const photoById = new Map(photos.map(p => [p.id, p]));
const pinnedIds = new Set([...Object.values(data.slots || {}), ...(data.posts || []).map(p => p.photo)].filter(id => photoById.has(id)));
let pool = shuffle(photos.filter(p => !pinnedIds.has(p.id)));
if (!pool.length) pool = shuffle(photos);
let poolIndex = 0;
const picked = new Map();
function pick(key, pinnedId) {
  if (pinnedId && photoById.has(pinnedId)) return photoById.get(pinnedId);
  if (!picked.has(key)) picked.set(key, pool.length ? pool[poolIndex++ % pool.length] : null);
  return picked.get(key);
}
const spot = key => pick('spot:' + key, data.slots?.[key]);
const postPhoto = post => pick('post:' + post.id, post.photo);
const img = (p, cls = '', eager = false) => p
  ? `<img class="${cls}" src="${esc(p.src)}" alt="${esc(p.alt || '')}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`
  : `<span class="photo-empty ${cls}" aria-hidden="true"></span>`;

/* ---------- Shared pieces ---------- */
const initials = name => name.replace(/^the\s+/i, '').split(/[\s-]+/).filter(Boolean).map(w => /^[A-Z0-9]{2,5}$/.test(w) ? w : w[0]).join('').toUpperCase().slice(0, 3);
function partnerMark(p, i, size = '') {
  if (p.logo) return `<span class="partner-mark has-logo ${size}"><img src="${esc(p.logo)}" alt="" loading="lazy"></span>`;
  return `<span class="partner-mark tone-${i % 4} ${size}" aria-hidden="true"><b>${esc(initials(p.name))}</b></span>`;
}
const partners = data.partners || [];
const featured = partners.filter(p => p.featured).slice(0, 3);
const others = partners.filter(p => !featured.includes(p));

function featuredCards() {
  return `<div class="featured-partners">${featured.map((p, i) => `<article class="featured-partner" data-reveal style="--d:${i}">
    ${partnerMark(p, i, 'large')}
    <h3>${esc(p.name)}</h3>${p.description ? `<p>${esc(p.description)}</p>` : ''}
    ${p.url ? `<a class="card-link" href="${esc(p.url)}" target="_blank" rel="noopener">Visit website ${arrow}</a>` : ''}
  </article>`).join('')}</div>`;
}

const blogPosts = (data.posts || []).filter(p => p.title);
const formatDate = d => { if (!d) return ''; const t = new Date(d + 'T12:00:00'); return isNaN(t) ? d : t.toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'}); };
function postCard(post, i = 0) {
  return `<article class="post-card" data-reveal style="--d:${i % 3}">
    <div class="post-photo">${img(postPhoto(post))}</div>
    <div class="post-copy"><p class="post-meta">${post.tag ? `<span class="tag">${esc(post.tag)}</span>` : ''}${post.date ? `<time datetime="${esc(post.date)}">${esc(formatDate(post.date))}</time>` : ''}</p>
      <h3><a href="/blog/${esc(post.id)}">${esc(post.title)}</a></h3><p>${esc(post.summary)}</p>
      <span class="card-link" aria-hidden="true">Read post ${arrow}</span></div>
  </article>`;
}

const located = network.filter(e => Array.isArray(e.coordinates));
const countries = new Set(network.map(e => e.geography).filter(Boolean));
const stats = [
  {value: network.length, label: 'Schools & communities in our network'},
  {value: countries.size, label: 'Countries reached'},
  {value: partners.length, label: 'Partner organizations'},
  {value: content.focusAreas.length, label: 'Focus areas'}
];
const statGrid = (cls = '') => `<div class="stat-grid ${cls}">${stats.map((s, i) => `<div class="stat" data-reveal style="--d:${i}"><strong data-count="${s.value}">${s.value}</strong><span>${esc(s.label)}</span></div>`).join('')}</div>`;

function pageIntro(eyebrow, title, lead, photoKey, extra = '') {
  return `<section class="page-intro"><div class="wrap intro-grid">
    <div class="intro-copy" data-enter><p class="eyebrow">${esc(eyebrow)}</p><h1>${title}</h1><p class="lead">${esc(lead)}</p>${extra}</div>
    <div class="intro-photo" data-enter style="--d:1">${img(spot(photoKey), '', true)}<span class="logo-badge" aria-hidden="true"><img src="/assets/brand/lumin-icon.png" alt=""></span></div>
  </div></section>`;
}

/* ---------- Home ---------- */
// Phones get 3 big columns. Desktop gets 5, or 4 while there aren't yet enough photos to fill 5 without repeats.
const wallColumns = () => matchMedia('(max-width: 860px)').matches ? 3 : (photos.filter(p => p.wall !== false).length >= 24 ? 5 : 4);
// Every photo is used once before any repeats; when photos run short, repeats are spread as far apart as possible.
function photoWall(cols = wallColumns()) {
  let wallPhotos = photos.filter(p => p.wall !== false);
  if (!wallPhotos.length) wallPhotos = photos;
  if (!wallPhotos.length) return '';
  const tile = innerWidth * (cols === 3 ? 1.4 : 1.04) / cols * 0.75;                     // tiles are 4:3 landscape, so this is roughly their height
  const perColumn = Math.max(4, Math.ceil(Math.max(720, innerHeight) * 1.25 / tile) + 1); // fills the screen, so one column never shows a photo twice at once
  const order = shuffle(wallPhotos), n = order.length;
  const columns = Array.from({length: cols}, () => []);
  for (let i = 0; i < cols * perColumn; i++) {
    columns[i % cols].push(order[(i + Math.floor(i / n)) % n]);    // each pass through the list shifts by one, so a repeat lands in a different column
  }
  return `<div class="photo-wall cols-${cols}" aria-hidden="true">${columns.map((list, c) => {
    const tiles = list.map(p => `<img src="${esc(p.src)}" alt="" decoding="async">`).join('');
    return `<div class="photo-column" style="--cycle-time: ${(list.length * (5.5 + c % 3 * 0.6)).toFixed(1)}s"><div class="photo-track"><div class="photo-sequence">${tiles}</div><div class="photo-sequence">${tiles}</div></div></div>`;
  }).join('')}</div>`;
}

function home() {
  return `<section class="hero photo-hero">
    ${photoWall()}
    <div class="hero-bloom"></div>
    <canvas class="hero-sky" aria-hidden="true"></canvas>
    <div class="hero-center wrap" data-enter>
      <h1>Project <span>Lumin</span></h1>
      <p class="hero-line">${esc(content.heroLine)}</p>
      <div class="actions">${button('Read the blog', '/blog')}${button('See our impact', '/impact', 'secondary')}</div>
    </div>
    <a class="scroll-cue" href="#blog" aria-label="Scroll to the blog"><span></span></a>
  </section>

  ${section(heading('Blog', 'Latest from Project Lumin', '', button('All posts', '/blog', 'secondary')) +
    `<div class="post-grid">${blogPosts.slice(0, 3).map(postCard).join('')}</div>`, 'blog-section', 'blog')}

  ${section(heading('Focus areas', 'Three ways we protect<br>young people under the sun.', content.approach) +
    `<div class="focus-grid">${content.focusAreas.map((f, i) => `<a class="focus-card" href="/about#${f.id}" data-reveal style="--d:${i}">
      <div class="focus-photo">${img(spot('focus-' + f.id))}<span class="focus-number">${f.number}</span></div>
      <div class="focus-copy"><h3>${esc(f.title)}</h3><p>${esc(f.short)}</p>
      <ul>${f.points.map(([t]) => `<li>${esc(t)}</li>`).join('')}</ul><span class="card-link">Learn more ${arrow}</span></div>
    </a>`).join('')}</div>`, 'focus-section', 'focus')}

  <section class="impact-band"><div class="wrap">
    <div class="impact-band-head" data-reveal><div><p class="eyebrow">Impact</p><h2>A movement that keeps growing.</h2></div>${button('See our impact', '/impact')}</div>
    ${statGrid('on-dark')}
  </div></section>

  ${section(heading('Partnerships', 'Working alongside<br>great organizations.', '', '') + featuredCards() +
    (others.length ? `<a class="more-partners" href="/partnerships" data-reveal>
      <div class="more-copy"><strong>+${others.length}</strong><span>more partners<br>across our network</span></div>
      <div class="marquee" aria-hidden="true"><div class="marquee-track">${[...others, ...others].map((p, i) => `<span class="marquee-item">${partnerMark(p, i, 'small')}${esc(p.name)}</span>`).join('')}</div></div>
      <span class="button primary">View all partners ${arrow}</span>
    </a>` : ''), 'partner-section', 'partners')}`;
}

/* ---------- Blog ---------- */
function blog() {
  return `<section class="page-intro compact"><div class="wrap"><div class="intro-copy" data-enter><p class="eyebrow">Blog</p><h1>News & stories</h1>
    <p class="lead">What Project Lumin is building, where we are going, and who we are working with.</p></div></div></section>` +
    section(blogPosts.length ? `<div class="post-grid">${blogPosts.map(postCard).join('')}</div>` : '<p class="lead">New posts are on the way.</p>', 'blog-section');
}

function blogPost(post) {
  if (!post) return `<section class="page-intro compact"><div class="wrap"><h1>Post not found</h1><p class="lead">This post may have moved.</p>${button('Back to the blog', '/blog')}</div></section>`;
  document.title = `${post.title} | Project Lumin`;
  const more = blogPosts.filter(p => p !== post).slice(0, 3);
  return `<article class="post-page"><div class="wrap post-wrap" data-enter>
      <a class="back-link" href="/blog">← All posts</a>
      <p class="post-meta">${post.tag ? `<span class="tag">${esc(post.tag)}</span>` : ''}${post.date ? `<time datetime="${esc(post.date)}">${esc(formatDate(post.date))}</time>` : ''}</p>
      <h1>${esc(post.title)}</h1><p class="lead">${esc(post.summary)}</p>
    </div>
    <div class="wrap post-hero" data-enter style="--d:1">${img(postPhoto(post), '', true)}</div>
    <div class="wrap post-wrap post-body">${String(post.body || '').split(/\n\s*\n/).filter(Boolean).map(par => `<p>${esc(par)}</p>`).join('')}</div>
  </article>` + (more.length ? section(heading('Keep reading', 'More from the blog') + `<div class="post-grid">${more.map(postCard).join('')}</div>`, 'blog-section') : '');
}

/* ---------- Impact ---------- */
function impact() {
  const typeCounts = Object.entries(network.reduce((acc, e) => ({...acc, [e.type || 'Unspecified']: (acc[e.type || 'Unspecified'] || 0) + 1}), {})).sort((a, b) => b[1] - a[1]);
  const countryCounts = Object.entries(network.reduce((acc, e) => e.geography ? {...acc, [e.geography]: (acc[e.geography] || 0) + 1} : acc, {})).sort((a, b) => b[1] - a[1]);
  const maxCountry = countryCounts[0]?.[1] || 1;
  const typeClass = t => ({'School': 'school', 'Higher education': 'higher', 'Community': 'community'}[t] || 'other');
  const dots = located.map(e => {
    const [lat, lon] = e.coordinates;
    return `<circle class="map-dot ${typeClass(e.type)}" cx="${((lon + 180) * 2).toFixed(1)}" cy="${((84 - lat) * 2).toFixed(1)}" r="4.6" tabindex="0" data-name="${esc(e.name)}" data-place="${esc(e.location || e.geography || '')}" data-type="${esc(e.type)}"><title>${esc(e.name)}</title></circle>`;
  }).join('');
  const types = typeCounts.map(([t]) => t);
  // Lets people search "Texas" as well as "TX".
  const states = {AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'Washington DC', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'};
  const searchText = e => [e.name, e.location, e.geography, states[(e.location || '').match(/,\s*([A-Z]{2})$/)?.[1]]].filter(Boolean).join(' ').toLowerCase();
  return pageIntro('Impact', 'Sun safety, <span class="hl">spreading.</span>', 'Project Lumin reaches young people through a growing network of schools, communities, and partner organizations around the world.', 'impact-hero') +
    section(statGrid(), 'stats-section') +
    section(heading('Our network', 'Where we reach.', `${located.length} mapped locations across ${countries.size} countries. Hover or tap a dot to see who is there.`) +
      `<div class="map-card" data-reveal>
        <div class="map-frame"><svg class="world-map" viewBox="0 0 720 294" role="img" aria-label="World map of ${located.length} schools and communities in the Project Lumin network">
          <image href="/assets/world-map.svg" width="720" height="294"/>${dots}</svg>
          <div class="map-tip" hidden></div></div>
        <div class="map-legend">${['School', 'Higher education', 'Community'].map(t => `<span><i class="${typeClass(t)}"></i>${t}</span>`).join('')}</div>
      </div>
      <div class="chart-row">
        <div class="chart-card" data-reveal><h3>Top countries</h3><ul class="bars">${countryCounts.slice(0, 8).map(([c, n]) => `<li><span>${esc(c)}</span><b style="--w:${(n / maxCountry * 100).toFixed(1)}%"></b><em>${n}</em></li>`).join('')}</ul></div>
        <div class="chart-card" data-reveal style="--d:1"><h3>Who is in the network</h3><ul class="bars types">${typeCounts.map(([t, n]) => `<li><span>${esc(t)}</span><b class="${typeClass(t)}" style="--w:${(n / typeCounts[0][1] * 100).toFixed(1)}%"></b><em>${n}</em></li>`).join('')}</ul></div>
      </div>`, 'map-section', 'map') +
    section(heading('Chapters', 'Schools & communities.', 'Every school and community in our network.') +
      `<div class="directory-tools" data-reveal><label class="search"><span class="visually-hidden">Search schools and communities</span><input type="search" id="directory-search" placeholder="Search by name or place"></label>
        <div class="chips" role="group" aria-label="Filter by type"><button type="button" class="chip" aria-pressed="true" data-type="all">All</button>${types.map(t => `<button type="button" class="chip" aria-pressed="false" data-type="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
      <p class="directory-count" aria-live="polite"></p>
      <ul class="directory">${network.slice().sort((a, b) => a.name.localeCompare(b.name)).map(e => `<li data-type="${esc(e.type)}" data-search="${esc(searchText(e))}">
        <span class="dir-mark ${typeClass(e.type)}" aria-hidden="true">${esc(initials(e.name))}</span><div><strong>${esc(e.name)}</strong><span>${esc(e.location || e.geography || e.type)}</span></div></li>`).join('')}</ul>`, 'directory-section', 'chapters');
}

/* ---------- Partnerships ---------- */
function partnershipsPage() {
  return pageIntro('Partnerships', 'Stronger <span class="hl">together.</span>', 'We work with organizations of every size to bring sun safety to more young people, from global student networks to local nonprofits.', 'partners-hero',
    `<div class="actions">${button('Become a partner', mail('Partnering with Project Lumin'))}</div>`) +
    section(heading('Our partners', `${partners.length} organizations and counting.`) + featuredCards() +
      `<ul class="partner-grid">${others.map((p, i) => `<li class="partner-tile" data-reveal style="--d:${i % 4}">${partnerMark(p, i + 3)}<strong>${esc(p.name)}</strong>${p.description ? `<p>${esc(p.description)}</p>` : ''}${p.url ? `<a class="card-link" href="${esc(p.url)}" target="_blank" rel="noopener">Website ${arrow}</a>` : ''}</li>`).join('')}</ul>`, 'partner-section');
}

/* ---------- About ---------- */
function about() {
  return pageIntro('About', 'Sun safety starts with <span class="hl">students.</span>', content.oneLiner, 'about-hero', `<div class="actions">${button('Get involved', '/contact')}</div>`) +
    `<section class="mission-band"><div class="wrap" data-reveal><p class="eyebrow">Our mission</p><blockquote>${esc(content.mission)}</blockquote></div></section>` +
    section(`<div class="split"><div class="split-photo" data-reveal>${img(spot('about-approach'))}</div>
      <div data-reveal style="--d:1"><p class="eyebrow">Our approach</p><h2>Enjoy the outdoors. Stay protected.</h2><p class="lead">${esc(content.approach)}</p>
      <h3 class="small-head">Who we serve</h3><ul class="pill-list">${content.audience.map(a => `<li>${esc(a)}</li>`).join('')}</ul></div></div>`, 'approach-section') +
    section(heading('What we do', 'Our three focus areas.') + content.focusAreas.map((f, i) => `<article class="pillar" id="${f.id}" data-reveal>
      <div class="pillar-head"><span class="pillar-number">${f.number}</span><div><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div></div>
      <ul class="pillar-points">${f.points.map(([t, d]) => `<li><strong>${esc(t)}</strong><span>${esc(d)}</span></li>`).join('')}</ul></article>`).join(''), 'pillars-section');
}

/* ---------- Contact ---------- */
function contact() {
  return pageIntro('Contact', 'Let’s make sun safety <span class="hl">a habit.</span>', 'Reach out about partnerships, events, starting a chapter, or anything else.', 'contact-hero') +
    section(`<div class="contact-grid">
      <a class="contact-card" href="${esc(mail())}" data-reveal><span class="contact-icon" aria-hidden="true">✉</span><span class="contact-label">Email</span><strong>${esc(email)}</strong></a>
      ${instagram ? `<a class="contact-card" href="${esc(instagram)}" target="_blank" rel="noopener" data-reveal style="--d:1"><span class="contact-icon">${instagramIcon}</span><span class="contact-label">Instagram</span><strong>Follow us</strong></a>` : ''}
      ${linkedin ? `<a class="contact-card" href="${esc(linkedin)}" target="_blank" rel="noopener" data-reveal style="--d:2"><span class="contact-icon">${linkedinIcon}</span><span class="contact-label">LinkedIn</span><strong>Connect with us</strong></a>` : ''}
      <div class="contact-card" data-reveal style="--d:3"><span class="contact-icon" aria-hidden="true">☀</span><span class="contact-label">Based in</span><strong>Frisco, Texas</strong></div>
    </div>`, 'contact-section');
}

/* ---------- Render ---------- */
const pages = {'/about': ['About', about], '/blog': ['Blog', blog], '/impact': ['Impact', impact], '/partnerships': ['Partnerships', partnershipsPage], '/contact': ['Contact', contact]};
const currentPage = route.startsWith('/blog/') ? '/blog' : route;
if (route.startsWith('/blog/')) main.innerHTML = blogPost(blogPosts.find(p => p.id === route.split('/')[2]));
else if (pages[route]) { main.innerHTML = pages[route][1](); document.title = `${pages[route][0]} | Project Lumin`; }
else main.innerHTML = home();
document.body.dataset.page = currentPage === '/' ? 'home' : currentPage.slice(1);

/* ---------- Header & footer ---------- */
const nav = document.querySelector('.nav');
const menu = nav.querySelector('.menu');
nav.querySelector(`.nav-links a[href="${currentPage}"]`)?.setAttribute('aria-current', 'page');
const setMenu = open => { menu.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open); };
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') === 'false'));
document.addEventListener('click', e => { if (!nav.contains(e.target) || e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); } });
const onScroll = () => document.body.classList.toggle('scrolled', scrollY > 30);
addEventListener('scroll', onScroll, {passive: true}); onScroll();

document.querySelector('#footer').innerHTML = `<div class="wrap"><div class="footer-main">
  <div class="footer-brand"><a class="brand" href="/"><img src="/assets/brand/lumin-lockup-white.png" alt="Project Lumin home" width="592" height="240" loading="lazy"></a>
    <p>Empowering young people to safely enjoy the outdoors.</p>
    <div class="footer-contact">${textLink(email, mail())}${instagram ? `<a class="social" href="${esc(instagram)}" target="_blank" rel="noopener" aria-label="Project Lumin on Instagram">${instagramIcon}</a>` : ''}${linkedin ? `<a class="social" href="${esc(linkedin)}" target="_blank" rel="noopener" aria-label="Project Lumin on LinkedIn">${linkedinIcon}</a>` : ''}</div></div>
  <nav aria-label="Footer navigation">${[['/', 'Home'], ...Object.entries(pages).map(([u, [l]]) => [u, l])].map(([u, l]) => `<a href="${u}">${l}</a>`).join('')}</nav></div>
  <div class="footer-end"><span>© ${new Date().getFullYear()} Project Lumin</span><span>Frisco, Texas</span></div></div>`;

/* ---------- Motion ---------- */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('IntersectionObserver' in window && !reduceMotion) {
  document.documentElement.classList.add('motion');
  const revealer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('revealed');
    entry.target.querySelectorAll('[data-count]').forEach(countUp);
    if (entry.target.matches('[data-count]')) countUp(entry.target);
    revealer.unobserve(entry.target);
  }), {threshold: 0.12, rootMargin: '0px 0px -40px 0px'});
  document.querySelectorAll('[data-reveal], .bars').forEach(el => revealer.observe(el));
} else document.querySelectorAll('.bars').forEach(el => el.classList.add('revealed'));

function countUp(el) {
  const target = Number(el.dataset.count);
  if (!target || el.dataset.counted) return;
  el.dataset.counted = '1';
  const start = performance.now(), duration = 1400;
  const tick = now => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Rebuild the photo wall when the screen switches between the phone and desktop layouts.
matchMedia('(max-width: 860px)').addEventListener?.('change', () => {
  const wall = document.querySelector('.photo-wall');
  if (wall) { wall.outerHTML = photoWall(); fitWall(); }
});

// The tilted columns take up different amounts of room on different screens. Measure them on this
// screen and widen the gaps (which makes the photos a little smaller) until no two columns touch.
function fitWall() {
  const wall = document.querySelector('.photo-wall');
  if (!wall) return;
  wall.style.removeProperty('--wall-gap');
  const base = parseFloat(getComputedStyle(wall).columnGap) || 16;
  let gap = base;
  for (let i = 0; i < 8; i++) {
    const cols = [...wall.querySelectorAll('.photo-column')].map(c => c.getBoundingClientRect());
    let need = 0;
    for (let k = 1; k < cols.length; k++) need = Math.max(need, base - (cols[k].left - cols[k - 1].right));
    if (need <= 1) break;
    gap += need;
    wall.style.setProperty('--wall-gap', gap + 'px');
  }
}
let fitTimer;
addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitWall, 150); });
fitWall();

// Drifting sun motes behind the hero title.
const hero = document.querySelector('.photo-hero');
const sky = document.querySelector('.hero-sky');
if (hero && sky && !reduceMotion) {
  const ctx = sky.getContext('2d');
  let w, h, motes = [], running = true, mouseX = 0.5, mouseY = 0.5;
  const resize = () => {
    const r = devicePixelRatio || 1;
    w = sky.clientWidth; h = sky.clientHeight;
    sky.width = w * r; sky.height = h * r; ctx.setTransform(r, 0, 0, r, 0, 0);
    motes = Array.from({length: Math.round(Math.min(90, w * h / 14000))}, () => ({
      x: Math.random() * w, y: Math.random() * h, r: Math.random() * 2.2 + .6,
      vx: (Math.random() - .5) * .15, vy: -(Math.random() * .25 + .05), p: Math.random() * Math.PI * 2,
      gold: Math.random() < .7
    }));
  };
  const draw = () => {
    if (!running) return;
    ctx.clearRect(0, 0, w, h);
    for (const m of motes) {
      m.x += m.vx + (mouseX - .5) * .25; m.y += m.vy; m.p += .02;
      if (m.y < -10) { m.y = h + 10; m.x = Math.random() * w; }
      if (m.x < -10) m.x = w + 10; if (m.x > w + 10) m.x = -10;
      const a = .35 + Math.sin(m.p) * .3;
      ctx.beginPath(); ctx.arc(m.x, m.y + (mouseY - .5) * 12 * m.r, m.r, 0, Math.PI * 2);
      ctx.fillStyle = m.gold ? `rgba(244,167,48,${a})` : `rgba(22,50,109,${a * .55})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  };
  resize(); addEventListener('resize', resize);
  hero.addEventListener('pointermove', e => { mouseX = e.clientX / innerWidth; mouseY = e.clientY / innerHeight; });
  new IntersectionObserver(([e]) => {
    hero.classList.toggle('motion-offscreen', !e.isIntersecting);
    const was = running; running = e.isIntersecting; if (running && !was) draw();
  }).observe(hero);
  draw();
}

/* ---------- Impact page interactions ---------- */
const mapFrame = document.querySelector('.map-frame');
if (mapFrame) {
  const tip = mapFrame.querySelector('.map-tip');
  const show = dot => {
    const box = mapFrame.getBoundingClientRect(), d = dot.getBoundingClientRect();
    tip.innerHTML = `<strong>${esc(dot.dataset.name)}</strong><span>${esc(dot.dataset.place)} · ${esc(dot.dataset.type)}</span>`;
    tip.hidden = false;
    const x = d.left - box.left + d.width / 2;
    tip.style.left = Math.min(Math.max(x, 110), box.width - 110) + 'px';
    tip.style.top = (d.top - box.top) + 'px';
    mapFrame.querySelectorAll('.map-dot.active').forEach(el => el.classList.remove('active'));
    dot.classList.add('active');
  };
  mapFrame.addEventListener('pointerover', e => { if (e.target.matches('.map-dot')) show(e.target); });
  mapFrame.addEventListener('click', e => { if (e.target.matches('.map-dot')) show(e.target); });
  mapFrame.addEventListener('focusin', e => { if (e.target.matches('.map-dot')) show(e.target); });
  mapFrame.addEventListener('pointerleave', () => { tip.hidden = true; });
}
const directory = document.querySelector('.directory');
if (directory) {
  const search = document.querySelector('#directory-search');
  const chips = document.querySelectorAll('.chip');
  const count = document.querySelector('.directory-count');
  let type = 'all';
  const filter = () => {
    const q = search.value.trim().toLowerCase();
    let matches = 0;
    const limit = expanded || q || type !== 'all' ? Infinity : 24;
    directory.querySelectorAll('li').forEach(li => {
      const ok = (type === 'all' || li.dataset.type === type) && (!q || li.dataset.search.includes(q));
      if (ok) matches++;
      li.hidden = !ok || matches > limit;
    });
    count.textContent = matches > limit ? `Showing ${limit} of ${network.length}` : `Showing ${matches} of ${network.length}`;
    more.hidden = !(matches > limit);
  };
  let expanded = false;
  directory.insertAdjacentHTML('afterend', `<div class="directory-more"><button type="button" class="button secondary">Show all ${network.length} ${arrow}</button></div>`);
  const more = directory.nextElementSibling;
  more.querySelector('button').addEventListener('click', () => { expanded = true; filter(); });
  search.addEventListener('input', filter);
  chips.forEach(chip => chip.addEventListener('click', () => {
    type = chip.dataset.type;
    chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
    filter();
  }));
  filter();
}

if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
