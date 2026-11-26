'use strict';
// Photo tools for the admin panel: border removal, smart crop, crop/rotate/flip, and color adjustments.
// Uses globals from admin.js (state, upload, forgetFile, changed, render, setStatus, view, esc, photoById).

/* ---------- Border detection: finds plain white/black/solid bars around a picture ---------- */
function findBorders(source) {
  const W = source.width, H = source.height;
  const s = Math.min(1, 400 / Math.max(W, H));
  const w = Math.max(1, Math.round(W * s)), h = Math.max(1, Math.round(H * s));
  const c = Object.assign(document.createElement('canvas'), {width: w, height: h});
  const ctx = c.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(source, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const at = (x, y) => (y * w + x) * 4;
  // A line counts as border if nearly all its pixels match the color of the outermost line on that side.
  function lineColor(points) {
    let r = 0, g = 0, b = 0, a = 0;
    for (const [x, y] of points) { const i = at(x, y); r += d[i]; g += d[i + 1]; b += d[i + 2]; a += d[i + 3]; }
    const n = points.length; return [r / n, g / n, b / n, a / n];
  }
  function uniform(points, ref) {
    let ok = 0;
    for (const [x, y] of points) {
      const i = at(x, y);
      const transparent = d[i + 3] < 30 && ref[3] < 60;
      if (transparent || Math.abs(d[i] - ref[0]) + Math.abs(d[i + 1] - ref[1]) + Math.abs(d[i + 2] - ref[2]) < 42) ok++;
    }
    return ok / points.length >= 0.97;
  }
  const row = y => Array.from({length: w}, (_, x) => [x, y]);
  const col = x => Array.from({length: h}, (_, y) => [x, y]);
  function scan(lineAt, count) {
    const ref = lineColor(lineAt(0));
    // Only plain white, black or gray bars count, so a blue sky or green field is never cut off.
    const neutral = Math.max(ref[0], ref[1], ref[2]) - Math.min(ref[0], ref[1], ref[2]) < 28;
    const avg = (ref[0] + ref[1] + ref[2]) / 3;
    const plain = ref[3] < 60 || (neutral && (avg > 205 || avg < 50));
    if (!plain || !uniform(lineAt(0), ref)) return 0;
    let n = 0;
    while (n < count * 0.45 && uniform(lineAt(n), ref)) n++;
    return n;
  }
  const top = scan(i => row(i), h), bottom = scan(i => row(h - 1 - i), h);
  const left = scan(i => col(i), w), right = scan(i => col(w - 1 - i), w);
  const minEdge = Math.max(2, Math.round(Math.min(w, h) * 0.015));
  const t = top >= minEdge ? top : 0, bo = bottom >= minEdge ? bottom : 0, l = left >= minEdge ? left : 0, r = right >= minEdge ? right : 0;
  if (!t && !bo && !l && !r) return null;
  const pad = 1; // shave a pixel more so no faint line is left behind
  const x0 = (l ? l + pad : 0) / s, y0 = (t ? t + pad : 0) / s;
  const x1 = (w - (r ? r + pad : 0)) / s, y1 = (h - (bo ? bo + pad : 0)) / s;
  if (x1 - x0 < W * 0.08 || y1 - y0 < H * 0.08) return null;
  return {x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0)};
}

function cropCanvas(source, box) {
  const c = Object.assign(document.createElement('canvas'), {width: box.w, height: box.h});
  c.getContext('2d').drawImage(source, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  return c;
}
const canvasBlob = (canvas, type = 'image/jpeg') => new Promise(res => canvas.toBlob(res, type, 0.9));
async function loadImage(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

/* ---------- Smart crop (content-aware: finds faces/skin tones, detail and color) ---------- */
let smartcropLoading = null;
function loadSmartcrop() {
  if (window.smartcrop) return Promise.resolve(window.smartcrop);
  smartcropLoading ||= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/smartcrop@2.0.5/smartcrop.js';
    s.onload = () => window.smartcrop ? resolve(window.smartcrop) : reject(new Error('Smart crop did not load'));
    s.onerror = () => { smartcropLoading = null; reject(new Error('Could not load the smart crop tool. Check your internet connection.')); };
    document.head.append(s);
  });
  return smartcropLoading;
}
async function smartBox(source, aspect) {
  const sc = await loadSmartcrop();
  const result = await sc.crop(source, {width: 1000 * aspect, height: 1000, minScale: 0.75});
  const c = result.topCrop;
  return {x: c.x, y: c.y, w: c.width, h: c.height};
}

/* ---------- Editor ---------- */
const editorStyle = document.createElement('style');
editorStyle.textContent = `
  #editor { width: min(1100px, 100% - 24px); }
  .ed-body { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; padding: 20px; }
  .ed-stage { position: relative; display: grid; place-items: center; min-height: 300px; background: repeating-conic-gradient(#eee 0 25%, #fafafa 0 50%) 0 0 / 20px 20px; border-radius: 14px; overflow: hidden; user-select: none; touch-action: none; }
  .ed-wrap { position: relative; line-height: 0; }
  .ed-wrap canvas { max-width: 100%; max-height: 62vh; display: block; }
  .ed-crop { position: absolute; border: 2px solid #fff; box-shadow: 0 0 0 9999px #0d2150a6, 0 0 0 1px #0004 inset; cursor: move; }
  .ed-crop::before, .ed-crop::after { content: ""; position: absolute; inset: 0; border: 1px dashed #ffffff80; pointer-events: none; }
  .ed-crop::before { left: 33.3%; right: 33.3%; border-top: 0; border-bottom: 0; }
  .ed-crop::after { top: 33.3%; bottom: 33.3%; border-left: 0; border-right: 0; }
  .ed-h { position: absolute; width: 20px; height: 20px; background: #fff; border: 2px solid var(--navy); border-radius: 50%; z-index: 1; }
  .ed-h[data-h="nw"] { left: -11px; top: -11px; cursor: nwse-resize; } .ed-h[data-h="ne"] { right: -11px; top: -11px; cursor: nesw-resize; }
  .ed-h[data-h="sw"] { left: -11px; bottom: -11px; cursor: nesw-resize; } .ed-h[data-h="se"] { right: -11px; bottom: -11px; cursor: nwse-resize; }
  .ed-side { display: grid; align-content: start; gap: 16px; }
  .ed-side h3 { font-size: .8rem; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); margin-bottom: 6px; }
  .ed-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .ed-row .btn[aria-pressed="true"] { background: var(--navy); color: #fff; border-color: var(--navy); }
  .ed-magic { display: grid; gap: 8px; }
  .ed-magic .btn { justify-content: flex-start; }
  .ed-slider { display: grid; grid-template-columns: 90px 1fr 40px; align-items: center; gap: 8px; font-size: .88rem; font-weight: 600; }
  .ed-slider input { accent-color: var(--navy); }
  .ed-msg { min-height: 1.3em; font-size: .88rem; color: var(--navy); font-weight: 600; }
  .ed-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 0 20px 20px; }
  .photo .edit { position: absolute; top: 8px; right: 46px; height: 32px; padding: 0 12px; border: 0; border-radius: 16px; background: #ffffffe6; color: var(--navy); font-weight: 700; font-size: .82rem; box-shadow: 0 2px 8px #0003; }
  .tool-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 14px; margin-bottom: 14px; border-radius: 14px; background: #fff; border: 1px solid var(--rule); }
  .tool-row .switch { margin-right: auto; }
  @media (max-width: 800px) { .ed-body { grid-template-columns: 1fr; } }
`;
document.head.append(editorStyle);

const editor = document.createElement('dialog');
editor.id = 'editor';
editor.innerHTML = `<div class="dialog-head"><h2>Edit photo</h2><button class="btn" data-ed="cancel">Close</button></div>
  <div class="ed-body">
    <div class="ed-stage"><div class="ed-wrap"><canvas id="ed-canvas"></canvas>
      <div class="ed-crop" id="ed-crop"><span class="ed-h" data-h="nw"></span><span class="ed-h" data-h="ne"></span><span class="ed-h" data-h="sw"></span><span class="ed-h" data-h="se"></span></div></div></div>
    <div class="ed-side">
      <div><h3>Automatic</h3><div class="ed-magic">
        <button class="btn" data-ed="trim">✂ Remove borders</button>
        <button class="btn" data-ed="smart">✦ Smart crop (finds the subject)</button>
      </div></div>
      <div><h3>Crop shape</h3><div class="ed-row" id="ed-aspects">
        <button class="btn small" data-aspect="free">Free</button><button class="btn small" data-aspect="1">Square</button>
        <button class="btn small" data-aspect="1.3333">4:3</button><button class="btn small" data-aspect="0.75">3:4</button><button class="btn small" data-aspect="1.7778">16:9</button>
      </div></div>
      <div><h3>Rotate & flip</h3><div class="ed-row">
        <button class="btn small" data-ed="rotl" title="Rotate left">⟲ Left</button><button class="btn small" data-ed="rotr" title="Rotate right">⟳ Right</button>
        <button class="btn small" data-ed="flip">⇋ Flip</button>
      </div></div>
      <div><h3>Adjust</h3>
        <label class="ed-slider">Brightness<input type="range" min="50" max="150" value="100" data-adj="b"><output>100</output></label>
        <label class="ed-slider">Contrast<input type="range" min="50" max="150" value="100" data-adj="c"><output>100</output></label>
        <label class="ed-slider">Color<input type="range" min="0" max="200" value="100" data-adj="s"><output>100</output></label>
      </div>
      <button class="btn small" data-ed="reset">Reset everything</button>
      <p class="ed-msg" role="status"></p>
    </div>
  </div>
  <div class="ed-foot"><button class="btn" data-ed="cancel">Cancel</button><button class="btn primary" data-ed="save">Save photo</button></div>`;
document.body.append(editor);

const edCanvas = editor.querySelector('#ed-canvas');
const edCrop = editor.querySelector('#ed-crop');
const edMsg = editor.querySelector('.ed-msg');
let ed = null; // {photo, img, rot, flip, aspect, crop: {x,y,w,h} in 0..1 of the oriented image, adj}

function oriented() {
  const {img, rot, flip} = ed;
  const scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
  const iw = Math.round(img.naturalWidth * scale), ih = Math.round(img.naturalHeight * scale);
  const swap = rot % 180 !== 0;
  const c = Object.assign(document.createElement('canvas'), {width: swap ? ih : iw, height: swap ? iw : ih});
  const x = c.getContext('2d');
  x.translate(c.width / 2, c.height / 2);
  x.rotate(rot * Math.PI / 180);
  if (flip) x.scale(-1, 1);
  x.drawImage(img, -iw / 2, -ih / 2, iw, ih);
  return c;
}
const filterCss = () => `brightness(${ed.adj.b}%) contrast(${ed.adj.c}%) saturate(${ed.adj.s}%)`;

function drawEditor() {
  ed.source = oriented();
  edCanvas.width = ed.source.width; edCanvas.height = ed.source.height;
  edCanvas.getContext('2d').drawImage(ed.source, 0, 0);
  edCanvas.style.filter = filterCss();
  placeCrop();
}
function placeCrop() {
  const {x, y, w, h} = ed.crop;
  Object.assign(edCrop.style, {left: x * 100 + '%', top: y * 100 + '%', width: w * 100 + '%', height: h * 100 + '%'});
  editor.querySelectorAll('[data-aspect]').forEach(b => b.setAttribute('aria-pressed', String(String(ed.aspect ?? 'free') === b.dataset.aspect)));
}
// Largest centered box of the chosen shape (aspect is width/height in pixels).
function fitAspect(aspect, within = {x: 0, y: 0, w: 1, h: 1}) {
  if (!aspect) return {...within};
  const W = ed.source.width, H = ed.source.height;
  const pw = within.w * W, ph = within.h * H;
  let w = pw, h = pw / aspect;
  if (h > ph) { h = ph; w = ph * aspect; }
  return {x: within.x + (within.w - w / W) / 2, y: within.y + (within.h - h / H) / 2, w: w / W, h: h / H};
}
function setCropPx(box) {
  const W = ed.source.width, H = ed.source.height;
  ed.crop = {x: box.x / W, y: box.y / H, w: box.w / W, h: box.h / H};
  placeCrop();
}

async function openEditor(id) {
  const photo = photoById(id);
  if (!photo) return;
  if (/\.(svg|gif)$/i.test(photo.src)) return alert('SVG and GIF images can\'t be edited here.');
  try {
    const img = await loadImage(view(photo.src));
    ed = {photo, img, rot: 0, flip: false, aspect: null, crop: {x: 0, y: 0, w: 1, h: 1}, adj: {b: 100, c: 100, s: 100}};
    editor.querySelectorAll('[data-adj]').forEach(i => { i.value = 100; i.nextElementSibling.value = 100; });
    edMsg.textContent = '';
    editor.showModal();
    drawEditor();
  } catch { alert('Could not open this photo for editing.'); }
}

editor.addEventListener('click', async e => {
  const b = e.target.closest('[data-ed],[data-aspect]');
  if (!b || !ed) return;
  if (b.dataset.aspect) {
    ed.aspect = b.dataset.aspect === 'free' ? null : Number(b.dataset.aspect);
    if (ed.aspect) ed.crop = fitAspect(ed.aspect, ed.crop);
    return placeCrop();
  }
  const act = b.dataset.ed;
  if (act === 'cancel') return editor.close();
  if (act === 'rotl' || act === 'rotr') { ed.rot = (ed.rot + (act === 'rotr' ? 90 : 270)) % 360; ed.crop = {x: 0, y: 0, w: 1, h: 1}; ed.aspect = null; drawEditor(); }
  if (act === 'flip') { ed.flip = !ed.flip; ed.crop = {x: 1 - ed.crop.x - ed.crop.w, y: ed.crop.y, w: ed.crop.w, h: ed.crop.h}; drawEditor(); }
  if (act === 'reset') {
    Object.assign(ed, {rot: 0, flip: false, aspect: null, crop: {x: 0, y: 0, w: 1, h: 1}, adj: {b: 100, c: 100, s: 100}});
    editor.querySelectorAll('[data-adj]').forEach(i => { i.value = 100; i.nextElementSibling.value = 100; });
    edMsg.textContent = ''; drawEditor();
  }
  if (act === 'trim') {
    const box = findBorders(ed.source);
    if (!box) { edMsg.textContent = 'No borders found. This photo is already clean.'; return; }
    setCropPx(box); ed.aspect = null; placeCrop();
    edMsg.textContent = 'Borders removed. Press Save photo to keep it.';
  }
  if (act === 'smart') {
    edMsg.textContent = 'Finding the subject…';
    try {
      const trimmed = findBorders(ed.source) || {x: 0, y: 0, w: ed.source.width, h: ed.source.height};
      const aspect = ed.aspect || 1; // the site shows photos as squares
      const box = await smartBox(cropCanvas(ed.source, trimmed), aspect);
      setCropPx({x: trimmed.x + box.x, y: trimmed.y + box.y, w: box.w, h: box.h});
      ed.aspect = aspect; placeCrop();
      edMsg.textContent = 'Cropped around the subject. Drag the box to adjust.';
    } catch (err) { edMsg.textContent = err.message; }
  }
  if (act === 'save') {
    b.disabled = true; edMsg.textContent = 'Saving…';
    try {
      const W = ed.source.width, H = ed.source.height;
      const box = {x: Math.round(ed.crop.x * W), y: Math.round(ed.crop.y * H), w: Math.max(1, Math.round(ed.crop.w * W)), h: Math.max(1, Math.round(ed.crop.h * H))};
      const out = Object.assign(document.createElement('canvas'), {width: box.w, height: box.h});
      const x = out.getContext('2d');
      x.filter = filterCss();
      x.drawImage(ed.source, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
      const blob = await canvasBlob(out);
      const src = await upload(new File([blob], 'edited.jpg', {type: 'image/jpeg'}), 1800, {trim: false});
      forgetFile(ed.photo.src);
      ed.photo.src = src;
      changed(); render(); editor.close();
    } catch (err) { edMsg.textContent = 'Could not save: ' + err.message; }
    b.disabled = false;
  }
});
editor.addEventListener('input', e => {
  const k = e.target.dataset.adj;
  if (!k || !ed) return;
  ed.adj[k] = Number(e.target.value);
  e.target.nextElementSibling.value = e.target.value;
  edCanvas.style.filter = filterCss();
});

// Drag to move the crop box; drag a corner to resize it.
let drag = null;
edCrop.addEventListener('pointerdown', e => {
  e.preventDefault();
  const r = edCanvas.getBoundingClientRect();
  drag = {handle: e.target.dataset.h || 'move', sx: e.clientX, sy: e.clientY, start: {...ed.crop}, rw: r.width, rh: r.height};
  edCrop.setPointerCapture(e.pointerId);
});
edCrop.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = (e.clientX - drag.sx) / drag.rw, dy = (e.clientY - drag.sy) / drag.rh;
  const s = drag.start, min = 0.05;
  let {x, y, w, h} = s;
  if (drag.handle === 'move') {
    x = Math.min(Math.max(0, s.x + dx), 1 - s.w); y = Math.min(Math.max(0, s.y + dy), 1 - s.h);
  } else {
    const east = drag.handle.includes('e'), south = drag.handle.includes('s');
    let right = s.x + s.w, bottom = s.y + s.h;
    if (east) right = Math.min(1, Math.max(s.x + min, right + dx)); else x = Math.max(0, Math.min(right - min, s.x + dx));
    if (south) bottom = Math.min(1, Math.max(s.y + min, bottom + dy)); else y = Math.max(0, Math.min(bottom - min, s.y + dy));
    w = right - x; h = bottom - y;
    if (ed.aspect) {
      const ratio = ed.aspect * ed.source.height / ed.source.width; // width/height in 0..1 units
      if (w / h > ratio) w = h * ratio; else h = w / ratio;
      if (!east) x = right - w;
      if (!south) y = bottom - h;
      if (x < 0 || y < 0) return;
    }
  }
  ed.crop = {x, y, w, h};
  placeCrop();
});
edCrop.addEventListener('pointerup', () => { drag = null; });

/* ---------- Automatic border removal: on upload and for the whole library ---------- */
const autoTrimKey = 'lumin-auto-trim';
function autoTrimOn() { try { return localStorage.getItem(autoTrimKey) !== 'off'; } catch { return true; } }
function setAutoTrim(on) { try { localStorage.setItem(autoTrimKey, on ? 'on' : 'off'); } catch {} }

async function fixAllBorders(button) {
  const list = state.photos.filter(p => !/\.(svg|gif)$/i.test(p.src));
  let fixed = 0, done = 0;
  button.disabled = true;
  for (const p of list) {
    setStatus(`Checking photos for borders… ${++done} of ${list.length}`, 'saving');
    try {
      const img = await loadImage(view(p.src));
      const box = findBorders(img);
      if (!box) continue;
      const blob = await canvasBlob(cropCanvas(img, box));
      const src = await upload(new File([blob], 'trimmed.jpg', {type: 'image/jpeg'}), 1800, {trim: false});
      forgetFile(p.src);
      p.src = src; fixed++;
    } catch { /* skip photos that can't be read */ }
  }
  button.disabled = false;
  if (fixed) { changed(); render(); setStatus(`Removed borders from ${fixed} photo${fixed > 1 ? 's' : ''}. Press ${verb()} changes to keep them.`, 'dirty'); }
  else setStatus(dirty ? (mode === 'live' ? 'Unpublished changes' : 'Unsaved changes') : 'No borders found. All photos are clean.', dirty ? 'dirty' : '');
}

/* ---------- Smart crop for the whole library: remove borders, then square-crop around the subject ---------- */
async function smartCropAll(button) {
  const list = state.photos.filter(p => !/\.(svg|gif)$/i.test(p.src));
  let cropped = 0, done = 0, failed = 0;
  button.disabled = true;
  try { await loadSmartcrop(); } catch (e) { setStatus(e.message, 'error'); button.disabled = false; return; }
  for (const p of list) {
    setStatus(`Smart cropping… ${++done} of ${list.length}`, 'saving');
    try {
      const img = await loadImage(view(p.src));
      const trimmed = findBorders(img) || {x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight};
      const square = Math.abs(trimmed.w / trimmed.h - 1) < 0.02;
      const untouched = trimmed.w === img.naturalWidth && trimmed.h === img.naturalHeight;
      if (square && untouched) continue; // already a clean square
      const base = cropCanvas(img, trimmed);
      const box = square ? {x: 0, y: 0, w: base.width, h: base.height} : await smartBox(base, 1);
      const blob = await canvasBlob(cropCanvas(base, {x: Math.round(box.x), y: Math.round(box.y), w: Math.round(box.w), h: Math.round(box.h)}));
      const src = await upload(new File([blob], 'smart-crop.jpg', {type: 'image/jpeg'}), 1800, {trim: false});
      forgetFile(p.src);
      p.src = src; cropped++;
    } catch { failed++; }
  }
  button.disabled = false;
  const extra = failed ? ` (${failed} couldn't be read)` : '';
  if (cropped) { changed(); render(); setStatus(`Smart cropped ${cropped} photo${cropped > 1 ? 's' : ''}${extra}. Press ${verb()} changes to keep them.`, 'dirty'); }
  else setStatus('All photos are already square and clean.' + extra);
}

/* ---------- Photo viewer: flip through every photo, edit or delete from there ---------- */
const viewerStyle = document.createElement('style');
viewerStyle.textContent = `
  .photo img.open-viewer { cursor: zoom-in; }
  #viewer { width: min(1000px, 100% - 24px); background: #0d2150; color: #fff; }
  #viewer .dialog-head { background: #0d2150; border-color: #ffffff22; color: #fff; }
  #viewer .dialog-head h2 { color: #fff; font-size: 1.05rem; }
  .vw-stage { position: relative; display: grid; place-items: center; height: min(68vh, 720px); padding: 10px 70px; }
  .vw-stage { overflow: hidden; }
  .vw-stage img { width: auto; max-width: 100%; max-height: calc(min(68vh, 720px) - 20px); object-fit: contain; border-radius: 10px; box-shadow: 0 20px 50px #0008; }
  .vw-nav { position: absolute; top: 50%; translate: 0 -50%; width: 52px; height: 52px; border-radius: 50%; border: 0; background: #ffffff1f; color: #fff; font-size: 1.8rem; line-height: 1; }
  .vw-nav:hover { background: var(--gold); color: var(--navy-deep); }
  .vw-prev { left: 10px; } .vw-next { right: 10px; }
  .vw-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 20px 18px; }
  .vw-info { margin-right: auto; font-size: .88rem; color: #c6d2ea; }
  .vw-bar .btn { background: #fff; }
  .vw-bar .btn.primary { background: var(--gold); }
  @media (max-width: 700px) { .vw-stage { padding: 10px 8px 60px; } .vw-nav { top: auto; bottom: 6px; translate: none; } }
`;
document.head.append(viewerStyle);

const viewer = document.createElement('dialog');
viewer.id = 'viewer';
viewer.innerHTML = `<div class="dialog-head"><h2 id="vw-count"></h2><button class="btn" data-vw="close">Close</button></div>
  <div class="vw-stage"><button class="vw-nav vw-prev" data-vw="prev" aria-label="Previous photo">‹</button><img id="vw-img" alt=""><button class="vw-nav vw-next" data-vw="next" aria-label="Next photo">›</button></div>
  <div class="vw-bar"><span class="vw-info" id="vw-info"></span>
    <button class="btn small" data-vw="wall"></button>
    <button class="btn small danger" data-vw="delete">Delete</button>
    <button class="btn small primary" data-vw="edit">✎ Edit photo</button></div>`;
document.body.append(viewer);
let viewIndex = 0;

function showViewer() {
  if (!state.photos.length) return viewer.close();
  viewIndex = (viewIndex + state.photos.length) % state.photos.length;
  const p = state.photos[viewIndex];
  viewer.querySelector('#vw-img').src = view(p.src);
  viewer.querySelector('#vw-count').textContent = `Photo ${viewIndex + 1} of ${state.photos.length}`;
  const used = usage(p.id);
  viewer.querySelector('#vw-info').textContent = (p.wall !== false ? 'In the moving wall' : 'Not in the moving wall') + (used.length ? ' · Pinned: ' + used.join(', ') : '');
  viewer.querySelector('[data-vw="wall"]').textContent = p.wall !== false ? 'Remove from moving wall' : 'Add to moving wall';
  // preload neighbours so Next feels instant
  [1, -1].forEach(d => { const n = state.photos[(viewIndex + d + state.photos.length) % state.photos.length]; if (n) new Image().src = view(n.src); });
}
function openViewer(id) {
  viewIndex = Math.max(0, state.photos.findIndex(p => p.id === id));
  showViewer();
  if (!viewer.open) viewer.showModal();
}
viewer.addEventListener('click', e => {
  const b = e.target.closest('[data-vw]');
  if (!b) return;
  const act = b.dataset.vw, p = state.photos[viewIndex];
  if (act === 'close') viewer.close();
  if (act === 'prev') { viewIndex--; showViewer(); }
  if (act === 'next') { viewIndex++; showViewer(); }
  if (act === 'edit') openEditor(p.id);
  if (act === 'wall') { p.wall = p.wall === false; changed(); render(); showViewer(); }
  if (act === 'delete' && confirm('Delete this photo from the site?')) {
    if (typeof selected !== 'undefined') selected.delete(p.id);
    deletePhoto(p.id); render(); showViewer();
  }
});
viewer.addEventListener('keydown', e => {
  if (editor.open) return;
  if (e.key === 'ArrowRight') { viewIndex++; showViewer(); }
  if (e.key === 'ArrowLeft') { viewIndex--; showViewer(); }
});
// After editing, show the updated photo in the viewer.
editor.addEventListener('close', () => { if (viewer.open) showViewer(); });
