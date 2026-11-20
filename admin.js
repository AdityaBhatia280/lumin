'use strict';
// Project Lumin admin panel. Every change saves automatically to data/site-data.js through the local server.

const panel = document.querySelector('#panel');
const statusEl = document.querySelector('#status');
const photoInput = document.querySelector('#photo-input');
const logoInput = document.querySelector('#logo-input');
const picker = document.querySelector('#picker');
const spots = window.LUMEN_CONTENT.photoSpots;
let state = null;
let tab = 'photos';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const uid = prefix => prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const slug = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item';
const initials = name => String(name || '?').replace(/^the\s+/i, '').split(/[\s-]+/).filter(Boolean).map(w => /^[A-Z0-9]{2,5}$/.test(w) ? w : w[0]).join('').toUpperCase().slice(0, 3);
const photoById = id => state.photos.find(p => p.id === id);
const setStatus = (text, cls = '') => { statusEl.textContent = text; statusEl.className = 'status ' + cls; };

/* ---------- Saving ---------- */
let saveTimer = null;
function save(now = false) {
  setStatus('Saving…', 'saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/data', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(state)});
      if (!res.ok) throw new Error((await res.json()).error);
      setStatus('All changes saved ✓');
    } catch (e) { setStatus('Could not save: ' + e.message, 'error'); }
  }, now ? 0 : 500);
}
addEventListener('beforeunload', e => { if (statusEl.classList.contains('saving')) e.preventDefault(); });

/* ---------- Image processing & upload ---------- */
async function shrink(file, maxSide = 1800) {
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;
  const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'}).catch(() => null);
  if (!bitmap) throw new Error(`Couldn't read ${file.name}. If it's an iPhone HEIC photo, export it as JPG first.`);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = Object.assign(document.createElement('canvas'), {width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale)});
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const keepAlpha = file.type === 'image/png' || file.type === 'image/webp';
  return new Promise(resolve => canvas.toBlob(resolve, keepAlpha ? 'image/webp' : 'image/jpeg', .85));
}
async function upload(file, maxSide) {
  const blob = await shrink(file, maxSide);
  const res = await fetch('/api/upload?name=' + encodeURIComponent(file.name), {method: 'POST', headers: {'Content-Type': blob.type}, body: blob});
  const out = await res.json();
  if (!res.ok) throw new Error(`${file.name}: ${out.error}`);
  return out.src;
}
let uploadState = null;
async function uploadPhotos(files) {
  files = [...files].filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
  if (!files.length) return;
  uploadState = {done: 0, total: files.length, errors: []};
  render();
  for (const file of files) {
    try {
      const src = await upload(file);
      state.photos.unshift({id: uid('u'), src, alt: '', wall: true});
      save();
    } catch (e) { uploadState.errors.push(e.message); }
    uploadState.done++;
    if (tab === 'photos') render();
  }
  if (!uploadState.errors.length) setTimeout(() => { uploadState = null; if (tab === 'photos') render(); }, 2500);
  render();
}
async function deletePhoto(id) {
  const p = photoById(id);
  if (!p) return;
  state.photos = state.photos.filter(x => x !== p);
  for (const key of Object.keys(state.slots)) if (state.slots[key] === id) delete state.slots[key];
  for (const post of state.posts) if (post.photo === id) post.photo = null;
  if (p.src.startsWith('/assets/uploads/')) fetch('/api/delete-file', {method: 'POST', body: JSON.stringify({src: p.src})});
  save(); render();
}

/* ---------- Where each photo is used ---------- */
function usage(id) {
  const out = spots.filter(s => state.slots[s.key] === id).map(s => s.label);
  state.posts.filter(p => p.photo === id).forEach(p => out.push('Blog: ' + p.title));
  return out;
}

/* ---------- Tabs ---------- */
const views = {
  photos() {
    const samples = state.photos.filter(p => p.src.startsWith('/assets/preview-')).length;
    const onWall = state.photos.filter(p => p.wall !== false).length;
    return `<div class="intro"><div><h2>Photos</h2><p>Dump every photo you have here. They get shuffled across the whole site automatically: the moving wall on the homepage, blog posts, focus areas, and every page photo. Pick specific photos for specific places in <b>Photo spots</b>.</p></div></div>
      <label class="drop" id="drop" for="photo-input"><span class="sun" aria-hidden="true"></span><strong>Drop photos here</strong><span>or click to choose. Select as many as you want at once. Big photos are resized automatically.</span></label>
      ${uploadState ? `<div class="progress" role="status">Uploading ${Math.min(uploadState.done + 1, uploadState.total)} of ${uploadState.total}…${uploadState.done === uploadState.total ? ' Done!' : ''}<div class="bar"><i style="width:${uploadState.done / uploadState.total * 100}%"></i></div>${uploadState.errors.length ? `<div class="errors">${uploadState.errors.map(esc).join('<br>')}</div>` : ''}</div>` : ''}
      <div class="toolbar"><span class="note">${state.photos.length} photos · ${onWall} in the moving wall</span>
        <button class="btn small" data-action="wall-all">Put all in moving wall</button>
        ${samples ? `<button class="btn small danger" data-action="remove-samples">Remove ${samples} sample photos</button>` : ''}</div>
      ${state.photos.length ? `<div class="photo-grid">${state.photos.map(p => {
        const used = usage(p.id);
        return `<figure class="photo" style="margin:0"><img src="${esc(p.src)}" alt="" loading="lazy">
          ${p.src.startsWith('/assets/preview-') ? '<span class="sample">Sample</span>' : ''}
          <button class="del" data-action="delete-photo" data-id="${p.id}" aria-label="Delete photo" title="Delete photo">✕</button>
          <figcaption class="meta"><label><input type="checkbox" data-action="toggle-wall" data-id="${p.id}" ${p.wall !== false ? 'checked' : ''}> In moving wall</label>
          <input type="text" placeholder="Describe photo (optional)" value="${esc(p.alt)}" data-field="alt" data-id="${p.id}" aria-label="Photo description">
          ${used.length ? `<span class="used">Pinned: ${esc(used.join(', '))}</span>` : ''}</figcaption></figure>`;
      }).join('')}</div>` : '<div class="empty">No photos yet. Drop some above.</div>'}`;
  },
  spots() {
    const row = (label, page, id, target) => {
      const p = photoById(id);
      return `<div class="row">${p ? `<img class="thumb" src="${esc(p.src)}" alt="">` : '<span class="random-tile">Random<br>photo</span>'}
        <div><h3>${esc(label)}</h3><p>${esc(page)} · ${p ? 'Pinned to this photo' : 'Shows a random photo each visit'}</p></div>
        <div class="actions"><button class="btn small primary" data-action="pick" data-target="${esc(target)}">Choose photo</button>${p ? `<button class="btn small" data-action="unpin" data-target="${esc(target)}">Back to random</button>` : ''}</div></div>`;
    };
    return `<div class="intro"><div><h2>Photo spots</h2><p>Every place on the site that shows a photo. Leave one on <b>Random</b> and it pulls from your photo library, or pin a specific photo. The homepage moving wall uses every photo marked "In moving wall" on the Photos tab.</p></div></div>
      <div class="rows">${spots.map(s => row(s.label, s.page, state.slots[s.key], 'spot:' + s.key)).join('')}
      ${state.posts.map(p => row('Blog: ' + (p.title || 'Untitled post'), 'Blog post photo', p.photo, 'post:' + p.id)).join('')}</div>`;
  },
  blog() {
    return `<div class="intro"><div><h2>Blog posts</h2><p>Posts show newest-first in the order below. The top three appear on the homepage. Leave a blank line between paragraphs in the post text.</p></div><button class="btn primary" data-action="add-post">+ New post</button></div>
      ${state.posts.map((post, i) => {
        const p = photoById(post.photo);
        return `<section class="card"><div class="card-head"><span class="rank">${i + 1}</span><h3>${esc(post.title || 'Untitled post')}</h3>
          <button class="btn small" data-action="move-post" data-id="${post.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
          <button class="btn small" data-action="move-post" data-id="${post.id}" data-dir="1" ${i === state.posts.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
          <a class="btn small" href="/blog/${esc(post.id)}" target="_blank" rel="noopener">View ↗</a>
          <button class="btn small danger" data-action="delete-post" data-id="${post.id}">Delete</button></div>
          <div class="fields">
            <label class="field wide">Title<input data-post="${post.id}" data-field="title" value="${esc(post.title)}"></label>
            <label class="field">Tag <small>e.g. News, Event, Partnership</small><input data-post="${post.id}" data-field="tag" value="${esc(post.tag)}"></label>
            <label class="field">Date <small>optional</small><input type="date" data-post="${post.id}" data-field="date" value="${esc(post.date)}"></label>
            <label class="field wide">Short summary <small>shown on cards</small><textarea data-post="${post.id}" data-field="summary">${esc(post.summary)}</textarea></label>
            <label class="field wide">Post text<textarea class="body" data-post="${post.id}" data-field="body">${esc(post.body)}</textarea></label>
            <div class="field wide">Photo<div class="post-photo-pick">${p ? `<img src="${esc(p.src)}" alt="" style="aspect-ratio:1;object-fit:cover;border-radius:10px">` : '<span class="random-tile">Random</span>'}
              <button class="btn small primary" data-action="pick" data-target="post:${post.id}">Choose photo</button>${p ? `<button class="btn small" data-action="unpin" data-target="post:${post.id}">Back to random</button>` : ''}</div></div>
          </div></section>`;
      }).join('') || '<div class="empty">No posts yet.</div>'}`;
  },
  partners() {
    const featuredCount = state.partners.filter(p => p.featured).length;
    return `<div class="intro"><div><h2>Partners</h2><p>Order them biggest to smallest with the arrows. Turn on <b>Featured</b> for up to 3 partners to show them large on the homepage. Everyone else appears in the "+ more partners" strip and on the Partnerships page. Upload a logo, or a branded initials badge is made automatically.</p></div><button class="btn primary" data-action="add-partner">+ Add partner</button></div>
      ${state.partners.map((p, i) => `<section class="card"><div class="card-head"><span class="rank">${i + 1}</span>
          <span class="mark">${p.logo ? `<img src="${esc(p.logo)}" alt="">` : esc(initials(p.name))}</span>
          <h3>${esc(p.name || 'New partner')} ${p.featured ? '<span class="badge">Featured</span>' : ''}</h3>
          <button class="btn small" data-action="move-partner" data-id="${p.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
          <button class="btn small" data-action="move-partner" data-id="${p.id}" data-dir="1" ${i === state.partners.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
          <button class="btn small danger" data-action="delete-partner" data-id="${p.id}">Delete</button></div>
        <div class="fields">
          <label class="field">Name<input data-partner="${p.id}" data-field="name" value="${esc(p.name)}"></label>
          <label class="field">Website <small>optional</small><input type="url" placeholder="https://" data-partner="${p.id}" data-field="url" value="${esc(p.url)}"></label>
          <label class="field wide">Description <small>optional</small><textarea data-partner="${p.id}" data-field="description">${esc(p.description)}</textarea></label>
          <div class="field wide" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
            <button class="btn small primary" data-action="upload-logo" data-id="${p.id}">${p.logo ? 'Replace logo' : 'Upload logo'}</button>
            ${p.logo ? `<button class="btn small" data-action="remove-logo" data-id="${p.id}">Remove logo</button>` : ''}
            <label class="switch"><input type="checkbox" data-action="toggle-featured" data-id="${p.id}" ${p.featured ? 'checked' : ''} ${!p.featured && featuredCount >= 3 ? 'disabled' : ''}> Featured on homepage ${!p.featured && featuredCount >= 3 ? '<small style="font-weight:400;color:var(--muted)">(3 max, untick one first)</small>' : ''}</label>
          </div></div></section>`).join('')}`;
  },
  settings() {
    return `<div class="intro"><div><h2>Settings</h2><p>Shown in the footer and on the Contact page.</p></div></div>
      <section class="card"><div class="fields">
        <label class="field">Contact email<input type="email" data-setting="email" value="${esc(state.settings.email)}"></label>
        <label class="field">Instagram link <small>e.g. https://instagram.com/yourhandle</small><input type="url" placeholder="https://instagram.com/…" data-setting="instagram" value="${esc(state.settings.instagram)}"></label>
      </div></section>
      <p class="help">Changes save to this computer instantly; refresh the site to see them. To put them on the live website, the project needs to be pushed to GitHub.</p>`;
  }
};

function render() {
  if (!state) return;
  panel.innerHTML = views[tab]();
  document.querySelector('#count-photos').textContent = state.photos.length;
  document.querySelector('#count-blog').textContent = state.posts.length;
  document.querySelector('#count-partners').textContent = state.partners.length;
}

/* ---------- Photo picker ---------- */
let pickTarget = null;
function openPicker(target) {
  pickTarget = target;
  const current = currentPick(target);
  document.querySelector('#picker-title').textContent = 'Choose a photo';
  document.querySelector('#picker-grid').innerHTML = `<button data-choose="" aria-pressed="${!current}"><span class="random-tile">Random</span></button>` +
    state.photos.map(p => `<button data-choose="${p.id}" aria-pressed="${current === p.id}"><img src="${esc(p.src)}" alt="${esc(p.alt || 'Photo')}" loading="lazy"></button>`).join('');
  picker.showModal();
}
function currentPick(target) {
  const [kind, key] = target.split(/:(.*)/);
  return kind === 'spot' ? state.slots[key] : state.posts.find(p => p.id === key)?.photo;
}
function setPick(target, id) {
  const [kind, key] = target.split(/:(.*)/);
  if (kind === 'spot') { if (id) state.slots[key] = id; else delete state.slots[key]; }
  else { const post = state.posts.find(p => p.id === key); if (post) post.photo = id || null; }
  save(); render();
}
document.querySelector('#picker-grid').addEventListener('click', e => {
  const b = e.target.closest('[data-choose]');
  if (!b) return;
  setPick(pickTarget, b.dataset.choose);
  picker.close();
});

/* ---------- Events ---------- */
function move(list, id, dir) {
  const i = list.findIndex(x => x.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}
let logoTarget = null;
document.addEventListener('click', e => {
  const tabButton = e.target.closest('[data-tab]');
  if (tabButton) {
    tab = tabButton.dataset.tab;
    document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b === tabButton)));
    render(); scrollTo(0, 0); return;
  }
  const el = e.target.closest('[data-action]');
  if (!el || el.tagName === 'INPUT') return;
  const {action, id, target} = el.dataset;
  const dir = Number(el.dataset.dir);
  if (action === 'delete-photo' && confirm('Delete this photo from the site?')) deletePhoto(id);
  if (action === 'remove-samples' && confirm('Remove all the sample photos? Your own uploads stay.')) {
    state.photos.filter(p => p.src.startsWith('/assets/preview-')).forEach(p => deletePhoto(p.id));
  }
  if (action === 'wall-all') { state.photos.forEach(p => { p.wall = true; }); save(); render(); }
  if (action === 'pick') openPicker(target);
  if (action === 'unpin') setPick(target, null);
  if (action === 'close-picker') picker.close();
  if (action === 'add-post') {
    let base = 'new-post', postId = base, n = 2;
    while (state.posts.some(p => p.id === postId)) postId = base + '-' + n++;
    state.posts.unshift({id: postId, title: '', date: new Date().toISOString().slice(0, 10), tag: 'News', photo: null, summary: '', body: '', fresh: true});
    save(); render(); panel.querySelector('[data-field="title"]')?.focus();
  }
  if (action === 'move-post') { move(state.posts, id, dir); save(); render(); }
  if (action === 'delete-post' && confirm('Delete this post?')) { state.posts = state.posts.filter(p => p.id !== id); save(); render(); }
  if (action === 'add-partner') {
    state.partners.push({id: uid('partner'), name: '', url: '', logo: null, featured: false, description: ''});
    save(); render(); panel.querySelectorAll('[data-field="name"]')[state.partners.length - 1]?.focus();
  }
  if (action === 'move-partner') { move(state.partners, id, dir); save(); render(); }
  if (action === 'delete-partner' && confirm('Delete this partner?')) {
    const p = state.partners.find(x => x.id === id);
    if (p?.logo?.startsWith('/assets/uploads/')) fetch('/api/delete-file', {method: 'POST', body: JSON.stringify({src: p.logo})});
    state.partners = state.partners.filter(x => x !== p); save(); render();
  }
  if (action === 'upload-logo') { logoTarget = id; logoInput.value = ''; logoInput.click(); }
  if (action === 'remove-logo') {
    const p = state.partners.find(x => x.id === id);
    if (p.logo?.startsWith('/assets/uploads/')) fetch('/api/delete-file', {method: 'POST', body: JSON.stringify({src: p.logo})});
    p.logo = null; save(); render();
  }
});
document.addEventListener('change', e => {
  const {action, id} = e.target.dataset;
  if (action === 'toggle-wall') { photoById(id).wall = e.target.checked; save(); render(); }
  if (action === 'toggle-featured') { state.partners.find(p => p.id === id).featured = e.target.checked; save(); render(); }
});
document.addEventListener('input', e => {
  const t = e.target, field = t.dataset.field;
  if (t.dataset.setting) state.settings[t.dataset.setting] = t.value.trim();
  else if (t.dataset.post) {
    const post = state.posts.find(p => p.id === t.dataset.post);
    post[field] = t.value;
    // New posts get their web address from the title; published posts keep theirs so links don't break.
    if (field === 'title' && post.fresh) {
      let base = slug(t.value), next = base, n = 2;
      while (state.posts.some(p => p !== post && p.id === next)) next = base + '-' + n++;
      t.closest('.card').querySelectorAll('[data-post]').forEach(el => { el.dataset.post = next; });
      post.id = next;
    }
    t.closest('.card').querySelector('h3').textContent = t.value || 'Untitled post';
  } else if (t.dataset.partner) {
    const p = state.partners.find(x => x.id === t.dataset.partner);
    p[field] = t.value;
    if (field === 'name') t.closest('.card').querySelector('h3').firstChild.textContent = (t.value || 'New partner') + ' ';
  } else if (field === 'alt') photoById(t.dataset.id).alt = t.value;
  else return;
  save();
});
// Lock a new post's address once you leave the page section it was written in.
document.addEventListener('focusout', e => {
  const card = e.target.closest?.('.card');
  if (!card || card.contains(e.relatedTarget)) return;
  const post = state.posts.find(p => p.id === card.querySelector('[data-post]')?.dataset.post);
  if (post?.fresh && post.title) { delete post.fresh; save(); render(); }
});

photoInput.addEventListener('change', () => { uploadPhotos(photoInput.files); photoInput.value = ''; });
logoInput.addEventListener('change', async () => {
  const file = logoInput.files[0], p = state.partners.find(x => x.id === logoTarget);
  if (!file || !p) return;
  try {
    setStatus('Uploading logo…', 'saving');
    const src = await upload(file, 600);
    if (p.logo?.startsWith('/assets/uploads/')) fetch('/api/delete-file', {method: 'POST', body: JSON.stringify({src: p.logo})});
    p.logo = src; save(); render();
  } catch (e) { setStatus(e.message, 'error'); }
});
document.addEventListener('dragover', e => { e.preventDefault(); document.querySelector('#drop')?.classList.add('over'); });
document.addEventListener('dragleave', e => { if (!e.relatedTarget) document.querySelector('#drop')?.classList.remove('over'); });
document.addEventListener('drop', e => {
  e.preventDefault();
  document.querySelector('#drop')?.classList.remove('over');
  if (tab !== 'photos') { tab = 'photos'; document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === 'photos'))); }
  uploadPhotos(e.dataTransfer.files);
});

/* ---------- Start ---------- */
fetch('/api/data').then(async res => {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'The admin panel needs the local server.');
  state = await res.json();
  state.slots ||= {}; state.settings ||= {};
  setStatus('All changes saved ✓');
  render();
}).catch(e => {
  setStatus('Not connected', 'error');
  panel.innerHTML = `<div class="remote-warning"><h2>Admin needs the local server</h2><p>${esc(e.message)}</p><p>On the computer with the project, run <code>node server.cjs</code> and open <code>http://127.0.0.1:3000/admin</code>.</p></div>`;
});
