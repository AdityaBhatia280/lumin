const config = window.LUMIN_ASSETS || { images: {}, partners: [] };
document.querySelectorAll('[data-image]').forEach(area => {
  const asset = config.images?.[area.dataset.image];
  if (!asset?.src) return;
  const image = document.createElement('img');
  image.src = asset.src;
  image.alt = asset.alt || '';
  image.width = 1254; image.height = 1254;
  image.decoding = 'async';
  if (area.dataset.image === 'hero') image.fetchPriority = 'high';
  image.loading = area.dataset.image === 'hero' ? 'eager' : 'lazy';
  image.addEventListener('error', () => { image.remove(); area.classList.remove('has-image'); area.setAttribute('aria-hidden', 'true'); });
  area.append(image);
  area.classList.add('has-image');
  area.removeAttribute('aria-hidden');
});
const grid = document.querySelector('#partner-grid');
if (grid) {
  for (const partner of config.partners || []) {
    if (!partner.name || !partner.logo || !partner.relationship) continue;
    const card = document.createElement('article');
    const image = document.createElement('img'); image.src = partner.logo; image.alt = partner.name;
    const name = document.createElement('h2'); name.textContent = partner.name;
    const relationship = document.createElement('p'); relationship.textContent = partner.relationship;
    card.append(image, name, relationship);
    if (partner.url) { try { const url = new URL(partner.url); if (url.protocol === 'https:') { const link = document.createElement('a'); link.href = url.href; link.textContent = 'Visit ' + partner.name; card.append(link); } } catch {} }
    grid.append(card);
  }
  grid.hidden = !grid.children.length;
}
const menu = document.querySelector('.menu');
function closeMenu() { menu.setAttribute('aria-expanded', 'false'); document.querySelector('.nav-links').classList.remove('open'); }
menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') !== 'true'; menu.setAttribute('aria-expanded', String(open)); document.querySelector('.nav-links').classList.toggle('open', open); });
document.querySelectorAll('.nav-links a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); } });
const dialog = document.querySelector('#join-dialog');
const form = document.querySelector('#join-form');
const status = document.querySelector('#join-status');
let trigger;
try { const saved = JSON.parse(localStorage.getItem('lumin-interest')); if (saved) { form.elements.name.value = saved.name || ''; form.elements.email.value = saved.email || ''; } } catch {}
document.querySelectorAll('[data-join]').forEach(button => button.addEventListener('click', () => { trigger = button; form.elements.category.value = button.dataset.join; status.textContent = ''; dialog.showModal(); }));
dialog.querySelector('.close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => trigger?.focus());
dialog.addEventListener('click', event => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); });
form.addEventListener('submit', event => {
  event.preventDefault();
  const entry = { name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), category: form.elements.category.value, savedAt: new Date().toISOString() };
  if (!entry.name) { form.elements.name.setCustomValidity('Please enter your name.'); form.elements.name.reportValidity(); return; }
  try {
    const serialized = JSON.stringify(entry); localStorage.setItem('lumin-interest', serialized);
    if (localStorage.getItem('lumin-interest') !== serialized) throw new Error('Storage verification failed');
    status.textContent = 'Your interest is saved on this device only. It has not been sent to Project Lumin.';
  } catch { status.textContent = 'Your information could not be saved. Nothing has been sent. Please try again with browser storage enabled.'; }
});
form.elements.name.addEventListener('input', () => form.elements.name.setCustomValidity(''));
document.querySelector('#year').textContent = new Date().getFullYear();


const header = document.querySelector("header");
function updateHeaderSize() {
  const offset = window.scrollY;
  if (offset > 64) header.classList.add("is-scrolled");
  else if (offset < 16) header.classList.remove("is-scrolled");
}
window.addEventListener("scroll", updateHeaderSize, { passive: true });
window.addEventListener("pageshow", updateHeaderSize);
updateHeaderSize();
