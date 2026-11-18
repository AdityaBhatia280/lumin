'use strict';

const content = window.LUMEN_CONTENT;
const network = window.LUMEN_NETWORK;
const main = document.querySelector('main');
const route = location.pathname.replace(/\/$/, '') || '/';
const pages = {
  '/about': 'About', '/our-work': 'Our Work', '/partnerships': 'Partnerships',
  '/youth-ambassadors': 'Youth Ambassadors', '/digital-hub': 'Digital Hub', '/contact': 'Contact'
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const button = (text, url, style = 'primary') => `<a class="button ${style}" href="${esc(url)}">${esc(text)} <span aria-hidden="true">↗</span></a>`;
const textLink = (text, url) => `<a class="text-link" href="${esc(url)}">${esc(text)} <span aria-hidden="true">↗</span></a>`;
const badge = text => `<span class="badge">${esc(text)}</span>`;
const photo = (item, eager = false) => `<img src="${esc(item.src)}" alt="${esc(item.alt)}" ${eager ? '' : 'loading="lazy"'} decoding="async">`;
const mail = (subject = '') => 'mailto:' + content.email + (subject ? '?subject=' + encodeURIComponent(subject) : '');
const section = (body, options = '') => `<section class="section ${options}"><div class="wrap">${body}</div></section>`;
const intro = (label, heading, description, extra = '') => `<section class="page-intro"><div class="wrap" data-enter><p class="eyebrow">${esc(label)}</p><h1>${esc(heading)}</h1><p class="lead">${esc(description)}</p>${extra}</div></section>`;

function goals() {
  return section(`<div class="goals-layout"><div class="goal-copy"><p class="eyebrow">Our approach</p><h2>Three goals for<br>safer days outside.</h2>
    <div class="goal-list">${content.goals.map((g, i) => `<details id="${esc(g.id)}" name="goals" ${i === 0 ? 'open' : ''}><summary><span class="goal-number">0${i + 1}</span><span>${esc(g.title)}</span><span class="goal-toggle" aria-hidden="true"></span></summary><div>${g.status ? badge(g.status) : ''}<p>${esc(g.text)}</p></div></details>`).join('')}</div>
    </div><div class="goal-image" data-reveal>${photo(content.media.goals)}</div></div>`, 'goals-section');
}

function entryCard(entry) {
  const visual = entry.photo
    ? `<div class="entry-photo">${photo(entry.photo)}<span>${esc(entry.photo.caption)} · ${esc(entry.photo.credit)}</span></div>`
    : `<div class="entry-fallback" aria-hidden="true"><span>✳</span><strong>${esc(entry.name)}</strong></div>`;
  return `<article class="entry-card">${visual}<div class="entry-copy">
    <h3><button type="button" class="entry-link" data-entry="${esc(entry.id)}">${esc(entry.name)}<span aria-hidden="true">↗</span></button></h3>
    <p>${esc(entry.location || 'Location unpublished')} · ${esc(entry.type)}</p></div></article>`;
}

function projectCard(project) {
  return `<article class="panel project-card">${project.media.length ? `<div class="project-photo">${photo(project.media[0])}</div>` : ''}
    <div class="panel-inner">${project.status ? badge(project.status) : ''}<h3>${esc(project.title)}</h3><p>${esc(project.summary)}</p>
    ${textLink('Read project details', '/our-work/' + project.id)}</div></article>`;
}

function partnerCards(full = false) {
  return `<div class="partner-grid">${content.partners.map((p, i) => `<article class="panel partner-card">
    ${p.photo ? `<div class="project-photo">${photo(p.photo)}</div>` : ''}
    <div class="panel-inner">${p.logo ? `<img class="partner-logo" src="${esc(p.logo)}" alt="">` : `<span class="partner-symbol" aria-hidden="true">${i ? '◎' : '✳'}</span>`}
    <h3>${esc(p.name)}</h3><p>${esc(p.text)}</p>${full && p.url ? `<div class="partner-links">${textLink('Visit website', p.url)}</div>` : ''}</div></article>`).join('')}</div>`;
}

function communityPartners() {
  return `<h2 class="spaced">Community partners</h2>
    <ul class="community-partners">${content.communityPartners.map(partner => `<li>
      <span class="community-mark" aria-hidden="true">${partner.logo ? `<img src="${esc(partner.logo)}" alt="" loading="lazy">` : esc(partner.initials)}</span>
      <strong>${esc(partner.name)}</strong></li>`).join('')}</ul>`;
}

function ambassadorPreview() {
  const a = content.ambassador;
  return section(`<div class="feature-split"><div class="feature-photo" data-reveal>${photo(content.media.ambassadors)}</div>
    <div><p class="eyebrow">Get involved</p>${badge(a.status)}<h2>${esc(a.title)}</h2><p class="lead">${esc(a.summary)}</p>
    ${textLink('See the program', '/youth-ambassadors')}</div></div>`, 'ambassador-section');
}

function closeSection() {
  return section(`<div class="close-layout"><div><p class="eyebrow">Contact</p><h2>Let’s work together.</h2><p class="lead">Get in touch about bringing sun-safety education to your school or community.</p></div>${button('Work with us', '/contact')}</div>`, 'close-section');
}

function updatesSection() {
  return section(`<div class="section-top" id="updates"><div><h2>Latest updates</h2><p class="lead">What Project Lumin is preparing and where to follow along.</p></div>${button('See our work', '/our-work', 'secondary')}</div>
    <div class="updates-grid">${content.updates.map(update => `<article class="update-card">
      <div class="update-image">${photo(content.media[update.image])}</div>
      <div class="update-copy">${update.status ? badge(update.status) : ''}<h3><a href="${esc(update.url)}">${esc(update.title)}<span aria-hidden="true">↗</span></a></h3><p>${esc(update.summary)}</p></div>
    </article>`).join('')}</div>`, 'updates-section');
}

function impactSection() {
  const impact = content.impact;
  return section(`<div id="impact"><h2>Our impact</h2><p class="lead">${esc(impact.summary)}</p>
    <div class="impact-grid">${impact.measures.map(measure => `<a class="impact-stat" href="${esc(measure.href)}"><strong>${esc(measure.value)}</strong><span>${esc(measure.label)}</span><span class="impact-arrow" aria-hidden="true">↗</span></a>`).join('')}</div>
    <p class="impact-note">${esc(impact.note)}</p></div>`, 'impact-section');
}

function home() {
  const media = content.media;
  const wall = [
    [media.hero[2], media.lawn, media.ambassadors],
    [media.workshop, media.hero[0], media.goals],
    [media.lawn, media.hero[1], media.workshop],
    [media.ambassadors, media.goals, media.hero[2]],
    [media.hero[0], media.workshop, media.hero[1]]
  ];
  return `<section class="hero photo-hero" id="about" data-enter>
    <div class="photo-wall" aria-hidden="true">${wall.map((column, i) => {
      const adjacent = wall[(i + 2) % wall.length];
      const cycle = [...column, ...adjacent, ...column.slice().reverse(), adjacent[1], adjacent[2], adjacent[0]];
      const tiles = cycle.map(item => `<img src="${esc(item.src)}" alt="" decoding="async">`).join('');
      return `<div class="photo-column"><div class="photo-track"><div class="photo-sequence">${tiles}</div><div class="photo-sequence">${tiles}</div></div></div>`;
    }).join('')}</div>
    <div class="hero-bloom"></div>
    <div class="hero-sparks" aria-hidden="true"><div></div><div></div></div>
    <div class="hero-center wrap"><h1>Project <span>Lumin</span></h1>
      <p>${esc(content.heroLine)}</p>
      <div class="actions">${button('Explore our work', '/our-work')}${button('Scroll to updates', '#updates', 'secondary')}</div>
    </div>
  </section>
  ${updatesSection()}
  ${impactSection()}
  <div id="goals" class="anchor"></div>${goals()}
  ${section(`<div class="section-top"><div><h2>Partnerships</h2></div>${textLink('See partnerships', '/partnerships')}</div>${partnerCards()}`, 'partner-section')}
  ${ambassadorPreview()}
  ${section(`<div class="hub-preview"><div><p class="eyebrow">Digital Hub</p><h2>Sun-safety resources.</h2><p class="lead">A home for learning resources, with tools and trackers coming soon.</p></div>${button('Visit the Digital Hub', '/digital-hub', 'secondary')}</div>`, 'hub-section')}
  <div id="involved" class="anchor"></div>${closeSection()}`;
}

function about() {
  return intro('About', 'Sun safety starts with students.', content.mission) + goals() + closeSection();
}

function work() {
  return intro('Our Work', 'Sun-safety initiatives.', 'Follow Project Lumin’s work in digital awareness, community outreach, and student-led education.') +
    section(`<h2>Initiatives and updates</h2>${content.projects.length ?
      `<div class="partner-grid">${content.projects.map(projectCard).join('')}</div>` : '<p>Project updates will appear here as they become available.</p>'}`);
}

function projectPage(project) {
  if (!project) return intro('Our Work', 'Project unavailable', 'This project page could not be found.', button('See our work', '/our-work'));
  const related = project.locations.map(id => network.find(entry => entry.id === id)).filter(Boolean);
  return intro('Our Work', project.title, project.summary, project.status ? badge(project.status) : '') +
    section(`<h2>Project overview</h2><p class="lead">${esc(project.body)}</p>
    ${project.media.length ? `<h2>Project gallery</h2><div class="gallery">${project.media.map((m, i) => `<figure><button type="button" data-gallery="${i}" aria-label="Open image: ${esc(m.alt)}">${photo(m)}</button>${m.credit ? `<figcaption>${esc(m.credit)}</figcaption>` : ''}</figure>`).join('')}</div>` : ''}
    ${related.length ? `<h2>Related network locations</h2><div class="entry-grid">${related.map(entryCard).join('')}</div>` : ''}
    ${textLink('See all initiatives', '/our-work')}`);
}

function partnerships() {
  return intro('Partnerships', 'Working with schools and communities.', 'Project Lumin is working with Living with Eczema and planning student outreach through the SDG Champions and Neuroscience Nation networks.', button('Work with us', '/contact')) +
    section(`<h2>Our partners</h2>${partnerCards(true)}${communityPartners()}`, 'partner-section');
}

function ambassadors() {
  const a = content.ambassador;
  const fields = [['Application dates', a.dates], ['Eligibility', a.eligibility], ['Benefits', a.benefits]].filter(([, value]) => value);
  return intro('Get involved', a.title, a.summary, badge(a.status)) + section(`<div class="feature-split">
    <div class="feature-photo" data-reveal>${photo(content.media.ambassadors)}</div><div><h2>Bring sun safety to your community.</h2>
    ${fields.length ? `<dl>${fields.map(([key, val]) => `<dt>${esc(key)}</dt><dd>${esc(val)}</dd>`).join('')}</dl>` : '<p class="lead">Application dates, eligibility, and benefits will be shared when the program opens.</p>'}
    <div class="actions">${button('Ask about the program', mail(a.title), 'secondary')}${a.applicationUrl && a.status !== 'Coming soon' ? button('Apply to the program', a.applicationUrl) : ''}</div></div></div>`, 'ambassador-section');
}

function hub() {
  return intro('Digital Hub', 'Resources for sun-safe habits.', 'Find Project Lumin learning materials and see what’s planned for the Digital Hub.') +
    section(`<h2>Learning resources</h2>${content.resources.length ? `<ul class="resource-list">${content.resources.map(r => `<li>${textLink(r.title, r.url)}${r.description ? `<p>${esc(r.description)}</p>` : ''}</li>`).join('')}</ul>` : '<div class="panel panel-inner"><p>Project Lumin resources will appear here once they’re ready to share.</p></div>'}
    <h2 class="spaced">Tools and trackers</h2><div class="partner-grid">${content.tools.map(tool => `<article class="panel panel-inner">${badge('Coming soon')}<h3>${esc(tool)}</h3></article>`).join('')}</div>`, 'hub-section');
}

function contact() {
  return intro('Contact', 'Get in touch with Project Lumin.', 'Email us about partnerships, network activities, or the Youth Ambassador Program.', button('Email Project Lumin', mail())) +
    section(`<div class="panel panel-inner contact-panel"><h2>Contact email</h2>${textLink(content.email, mail())}<p>Frisco, Texas</p></div>`);
}

const pageRenderers = {'/about': about, '/our-work': work, '/network': work, '/chapters': work, '/partnerships': partnerships,
  '/partners': partnerships, '/partners.html': partnerships, '/youth-ambassadors': ambassadors, '/digital-hub': hub, '/contact': contact};
const project = route.startsWith('/our-work/') ? content.projects.find(p => p.id === route.split('/').at(-1)) : null;
const currentPage = route.startsWith('/our-work/') || route === '/network' || route === '/chapters' ? '/our-work' : route.startsWith('/partners') ? '/partnerships' : route;
main.innerHTML = route.startsWith('/our-work/') ? projectPage(project) : (pageRenderers[route] || home)();
document.title = pages[currentPage] ? `${project?.title || pages[currentPage]} | Project Lumin` : document.title;

const nav = document.querySelector('.nav');
const menu = nav.querySelector('.menu');
const more = nav.querySelector('.nav-more');
nav.querySelector(`a[href="${currentPage}"]`)?.setAttribute('aria-current', 'page');
function setMenu(open) { menu.setAttribute('aria-expanded', String(open)); if (!open) more.open = false; }
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') === 'false'));
document.addEventListener('click', event => { if (!nav.contains(event.target) || event.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
  if (more.open) { more.open = false; more.querySelector('summary').focus(); }
  else if (menu.getAttribute('aria-expanded') === 'true') { setMenu(false); menu.focus(); }
});

document.querySelector('#footer').innerHTML = `<div class="wrap"><div class="footer-main">
  <div><a class="brand" href="/" aria-label="Project Lumin home"><span>Project <strong>Lumin</strong></span></a><p>Student-led sun safety in Frisco, Texas.</p>${textLink(content.email, mail())}</div>
  <nav aria-label="Footer navigation">${Object.entries(pages).map(([url, label]) => `<a href="${url}">${label}</a>`).join('')}</nav></div>
  <div class="footer-end"><span>© ${new Date().getFullYear()} Project Lumin</span></div></div>`;

document.body.insertAdjacentHTML('beforeend', `<dialog id="detail-dialog" aria-labelledby="detail-title"><form method="dialog"><button class="dialog-close" aria-label="Close details" autofocus>×</button></form><div id="detail-body"></div></dialog>`);
const dialog = document.querySelector('#detail-dialog');
const detailBody = document.querySelector('#detail-body');
function showEntry(entry) {
  detailBody.innerHTML = `<h2 id="detail-title">${esc(entry.name)}</h2>
    <p>${esc(entry.location || 'Location unpublished')} · ${esc(entry.type)}</p>
    ${entry.photo ? `<figure class="detail-photo">${photo(entry.photo)}<figcaption>${esc(entry.photo.caption)} · ${esc(entry.photo.credit)}</figcaption></figure>` : ''}
    ${entry.sources.some(s => s.name !== entry.name) ? `<p>Also listed as ${entry.sources.filter(s => s.name !== entry.name).map(s => esc(s.name)).join(', ')}.</p>` : ''}`;
  dialog.showModal();
}

main.addEventListener('click', event => {
  const entryButton = event.target.closest('[data-entry]');
  if (entryButton) {
    const entry = network.find(item => item.id === entryButton.dataset.entry);
    if (entry) showEntry(entry);
  }
  const galleryButton = event.target.closest('[data-gallery]');
  if (galleryButton) {
    const image = project.media[Number(galleryButton.dataset.gallery)];
    detailBody.innerHTML = `<h2 id="detail-title">Project gallery</h2><figure class="detail-photo">${photo(image, true)}${image.credit ? `<figcaption>${esc(image.credit)}</figcaption>` : ''}</figure>`;
    dialog.showModal();
  }
});

dialog.addEventListener('click', event => {
  if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }
});

const hero = document.querySelector('.photo-hero');
if (hero) {
  if ('IntersectionObserver' in window) {
    const motionObserver = new IntersectionObserver(([entry]) => {
      hero.classList.toggle('motion-offscreen', !entry.isIntersecting);
    });
    motionObserver.observe(hero);

    const updatesObserver = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('updates-arrived');
        updatesObserver.unobserve(entry.target);
      }
    }, {threshold: 0.15});
    document.querySelectorAll('.update-card').forEach(card => updatesObserver.observe(card));
  }
}

if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      observer.unobserve(entry.target);
    }
  }, {threshold: 0.15});
  document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
}
if (location.hash) requestAnimationFrame(() => {
  const target = document.getElementById(location.hash.slice(1));
  if (target) { if (target.matches('details')) target.open = true; target.scrollIntoView(); }
});
