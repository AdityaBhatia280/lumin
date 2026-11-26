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

/* ---------- Originals: every edit starts from the untouched upload, and can always be undone ---------- */
const originalOf = p => p.original || p.src;
function replaceSrc(p, src) {
  p.original ||= p.src;                       // remember the untouched version the first time it's edited
  if (p.src !== p.original) forgetFile(p.src); // the previous edit is no longer needed
  p.src = src;
}
function restoreOriginal(p) {
  if (!p.original || p.src === p.original) return false;
  forgetFile(p.src);
  p.src = p.original;
  return true;
}

/* ---------- AI framing: finds people (TensorFlow COCO-SSD) and the Project Lumin logo, then frames them ---------- */
const loadScript = src => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Could not load the AI tool. Check your internet connection.'));
  document.head.append(s);
});
let detectorLoading = null;
function loadDetector() {
  detectorLoading ||= (async () => {
    if (!window.tf) await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
    if (!window.cocoSsd) await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
    return window.cocoSsd.load({base: 'mobilenet_v2'});
  })().catch(e => { detectorLoading = null; throw e; });
  return detectorLoading;
}

// Finds the Project Lumin logo/signs: navy ink sitting right next to the orange sun.
function findLogo(source) {
  const W = source.width, H = source.height, s = Math.min(1, 240 / Math.max(W, H));
  const w = Math.max(1, Math.round(W * s)), h = Math.max(1, Math.round(H * s));
  const c = Object.assign(document.createElement('canvas'), {width: w, height: h});
  const x = c.getContext('2d', {willReadFrequently: true});
  x.drawImage(source, 0, 0, w, h);
  const d = x.getImageData(0, 0, w, h).data;
  const cell = 8, gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  const navy = new Float32Array(gw * gh), orange = new Float32Array(gw * gh);
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const i = (y * w + xx) * 4, r = d[i], g = d[i + 1], b = d[i + 2], k = Math.floor(y / cell) * gw + Math.floor(xx / cell);
    if (b > 70 && b < 190 && b > r + 45 && b > g + 20 && r < 80) navy[k]++;
    if (r > 200 && g > 90 && g < 185 && b < 90 && r - b > 140) orange[k]++;
  }
  const area = cell * cell;
  let x0 = gw, y0 = gh, x1 = -1, y1 = -1, hits = 0;
  for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
    if (navy[gy * gw + gx] < area * 0.12) continue;
    let nearOrange = false;
    for (let dy = -3; dy <= 3 && !nearOrange; dy++) for (let dx = -3; dx <= 3; dx++) {
      const ny = gy + dy, nx = gx + dx;
      if (ny >= 0 && nx >= 0 && ny < gh && nx < gw && orange[ny * gw + nx] > area * 0.08) { nearOrange = true; break; }
    }
    if (!nearOrange) continue;
    hits++; x0 = Math.min(x0, gx); y0 = Math.min(y0, gy); x1 = Math.max(x1, gx); y1 = Math.max(y1, gy);
  }
  if (hits < 2) return null;
  return {x: x0 * cell / s, y: y0 * cell / s, w: (x1 - x0 + 1) * cell / s, h: (y1 - y0 + 1) * cell / s, kind: 'logo'};
}

async function findSubjects(source) {
  const model = await loadDetector();
  const found = await model.detect(source, 20, 0.4);
  let people = found.filter(f => f.class === 'person').map(f => ({x: f.bbox[0], y: f.bbox[1], w: f.bbox[2], h: f.bbox[3], kind: 'person', score: f.score}));
  // Ignore small people far in the background.
  const biggest = Math.max(0, ...people.map(p => p.w * p.h));
  people = people.filter(p => p.w * p.h >= biggest * 0.12);
  const logo = findLogo(source);
  return logo ? [...people, logo] : people;
}

// Square frame around all subjects. If they don't fit in a square, the box keeps everyone and
// "fill" is set so the leftover space is filled with a soft blurred copy of the photo.
function frameSubjects(W, H, subjects) {
  let x0 = Math.min(...subjects.map(s => s.x)), y0 = Math.min(...subjects.map(s => s.y));
  let x1 = Math.max(...subjects.map(s => s.x + s.w)), y1 = Math.max(...subjects.map(s => s.y + s.h));
  const pad = Math.max(x1 - x0, y1 - y0) * 0.07;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad * 1.4); x1 = Math.min(W, x1 + pad); y1 = Math.min(H, y1 + pad);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const need = Math.max(x1 - x0, y1 - y0);
  const clampBox = (bx, by, bw, bh) => ({x: Math.min(Math.max(0, bx), W - bw), y: Math.min(Math.max(0, by), H - bh), w: bw, h: bh});
  // Nearly fits: trim a little off the edges rather than adding a thin strip of background.
  if (need <= Math.min(W, H) * 1.12) {
    // Everyone fits: use the biggest square that still centers them, so the photo isn't over-zoomed.
    const side = Math.min(Math.min(W, H), Math.max(need, Math.min(W, H) * 0.55));
    if (need > side) return {box: clampBox(cx - side / 2, cy - side / 2, side, side), fill: false};
    return {box: clampBox(cx - side / 2, cy - side / 2, side, side), fill: false};
  }
  // Too wide or too tall for a square: keep all subjects, use as much of the other direction as the photo has.
  const wide = x1 - x0 >= y1 - y0;
  const bw = wide ? x1 - x0 : Math.min(W, y1 - y0);
  const bh = wide ? Math.min(H, x1 - x0) : y1 - y0;
  return {box: clampBox(wide ? x0 : cx - bw / 2, wide ? cy - bh / 2 : y0, bw, bh), fill: Math.abs(bw - bh) > 2};
}

// Draws a crop into a square; any empty space gets a blurred, enlarged copy of the photo behind it.
function renderSquare(source, box, filter = 'none') {
  const S = Math.round(Math.max(box.w, box.h));
  const out = Object.assign(document.createElement('canvas'), {width: S, height: S});
  const x = out.getContext('2d');
  if (Math.abs(box.w - box.h) > 2) {
    const scale = Math.max(S / box.w, S / box.h) * 1.15;
    x.filter = `blur(${Math.round(S / 30)}px) brightness(0.92) saturate(1.1)` + (filter !== 'none' ? ' ' + filter : '');
    x.drawImage(source, box.x, box.y, box.w, box.h, (S - box.w * scale) / 2, (S - box.h * scale) / 2, box.w * scale, box.h * scale);
  }
  x.filter = filter;
  x.drawImage(source, box.x, box.y, box.w, box.h, (S - box.w) / 2, (S - box.h) / 2, box.w, box.h);
  return out;
}

// Full automatic pipeline for one image: remove borders, find people/logo, frame them in a square.
async function autoFrame(img) {
  const trimmed = findBorders(img) || {x: 0, y: 0, w: img.naturalWidth || img.width, h: img.naturalHeight || img.height};
  const base = cropCanvas(img, trimmed);
  const subjects = await findSubjects(base);
  let frame;
  if (subjects.length) frame = frameSubjects(base.width, base.height, subjects);
  else frame = {box: await smartBox(base, 1).catch(() => {
    const s = Math.min(base.width, base.height); return {x: (base.width - s) / 2, y: (base.height - s) / 2, w: s, h: s};
  }), fill: false};
  const people = subjects.filter(s => s.kind === 'person').length, logo = subjects.some(s => s.kind === 'logo');
  return {trimmed, base, frame, people, logo};
}

/* ---------- Editor ---------- */
const editor = document.createElement('dialog');
editor.id = 'editor';
editor.innerHTML = `<div class="dialog-head"><h2>Edit photo</h2><button class="btn" data-ed="cancel">Close</button></div>
  <div class="ed-body">
    <div class="ed-stage"><div class="ed-wrap"><canvas id="ed-canvas"></canvas>
      <div class="ed-crop" id="ed-crop"><span class="ed-h" data-h="nw"></span><span class="ed-h" data-h="ne"></span><span class="ed-h" data-h="sw"></span><span class="ed-h" data-h="se"></span></div></div></div>
    <div class="ed-side">
      <div><h3>Automatic</h3><div class="ed-magic">
        <button class="btn primary" data-ed="frame">✦ Auto-frame with AI (people + logo)</button>
        <button class="btn" data-ed="trim">✂ Remove borders</button>
      </div></div>
      <div><h3>Crop shape</h3><div class="ed-row" id="ed-aspects">
        <button class="btn small" data-aspect="free">Free</button><button class="btn small" data-aspect="1">Square</button>
        <button class="btn small" data-aspect="1.3333">4:3</button><button class="btn small" data-aspect="0.75">3:4</button><button class="btn small" data-aspect="1.7778">16:9</button>
      </div>
      <label class="switch ed-fill"><input type="checkbox" id="ed-fill"> Fit everything in a square (fills the gaps with a soft background)</label></div>
      <div><h3>Rotate & flip</h3><div class="ed-row">
        <button class="btn small" data-ed="rotl" title="Rotate left">⟲ Left</button><button class="btn small" data-ed="rotr" title="Rotate right">⟳ Right</button>
        <button class="btn small" data-ed="flip">⇋ Flip</button>
      </div></div>
      <div><h3>Adjust</h3>
        <label class="ed-slider">Brightness<input type="range" min="50" max="150" value="100" data-adj="b"><output>100</output></label>
        <label class="ed-slider">Contrast<input type="range" min="50" max="150" value="100" data-adj="c"><output>100</output></label>
        <label class="ed-slider">Color<input type="range" min="0" max="200" value="100" data-adj="s"><output>100</output></label>
      </div>
      <div class="ed-row"><button class="btn small" data-ed="reset">Reset changes</button><button class="btn small" data-ed="restore" id="ed-restore">↺ Restore original</button></div>
      <p class="ed-msg" role="status"></p>
    </div>
  </div>
  <div class="ed-foot"><button class="btn" data-ed="cancel">Cancel</button><button class="btn primary" data-ed="save">Save photo</button></div>`;
document.body.append(editor);
editorStyle.textContent += `
  .ed-fill { margin-top: 10px; font-size: .84rem; line-height: 1.3; align-items: flex-start; }
  .ed-fill input { margin-top: 2px; }
  .ed-crop.fill { border-color: var(--gold); }
  .photo .edited { position: absolute; left: 46px; top: 10px; padding: 2px 8px; border-radius: 20px; background: #ffffffe6; font-size: .7rem; font-weight: 800; color: var(--navy); }
`;

const edCanvas = editor.querySelector('#ed-canvas');
const edCrop = editor.querySelector('#ed-crop');
const edMsg = editor.querySelector('.ed-msg');
const edFill = editor.querySelector('#ed-fill');
let ed = null; // {photo, img, rot, flip, aspect, fill, crop: {x,y,w,h} in 0..1 of the oriented image, adj}

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
  edCrop.classList.toggle('fill', ed.fill);
  edFill.checked = ed.fill;
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
    const img = await loadImage(view(originalOf(photo))); // always edit from the original
    ed = {photo, img, rot: 0, flip: false, aspect: null, fill: false, crop: {x: 0, y: 0, w: 1, h: 1}, adj: {b: 100, c: 100, s: 100}};
    editor.querySelectorAll('[data-adj]').forEach(i => { i.value = 100; i.nextElementSibling.value = 100; });
    editor.querySelector('#ed-restore').hidden = !(photo.original && photo.src !== photo.original);
    edMsg.textContent = photo.original && photo.src !== photo.original ? 'Showing the original photo. Your saved edit replaces the current version.' : '';
    editor.showModal();
    drawEditor();
  } catch { alert('Could not open this photo for editing.'); }
}

editor.addEventListener('change', e => { if (e.target === edFill && ed) { ed.fill = edFill.checked; if (ed.fill) ed.aspect = null; placeCrop(); } });
editor.addEventListener('click', async e => {
  const b = e.target.closest('[data-ed],[data-aspect]');
  if (!b || !ed) return;
  if (b.dataset.aspect) {
    ed.aspect = b.dataset.aspect === 'free' ? null : Number(b.dataset.aspect);
    if (ed.aspect) { ed.fill = false; ed.crop = fitAspect(ed.aspect, ed.crop); }
    return placeCrop();
  }
  const act = b.dataset.ed;
  if (act === 'cancel') return editor.close();
  if (act === 'rotl' || act === 'rotr') { ed.rot = (ed.rot + (act === 'rotr' ? 90 : 270)) % 360; ed.crop = {x: 0, y: 0, w: 1, h: 1}; ed.aspect = null; drawEditor(); }
  if (act === 'flip') { ed.flip = !ed.flip; ed.crop = {x: 1 - ed.crop.x - ed.crop.w, y: ed.crop.y, w: ed.crop.w, h: ed.crop.h}; drawEditor(); }
  if (act === 'reset') {
    Object.assign(ed, {rot: 0, flip: false, aspect: null, fill: false, crop: {x: 0, y: 0, w: 1, h: 1}, adj: {b: 100, c: 100, s: 100}});
    editor.querySelectorAll('[data-adj]').forEach(i => { i.value = 100; i.nextElementSibling.value = 100; });
    edMsg.textContent = ''; drawEditor();
  }
  if (act === 'restore') {
    if (restoreOriginal(ed.photo)) { changed(); render(); }
    editor.close();
  }
  if (act === 'trim') {
    const box = findBorders(ed.source);
    if (!box) { edMsg.textContent = 'No borders found. This photo is already clean.'; return; }
    ed.aspect = null; ed.fill = false; setCropPx(box);
    edMsg.textContent = 'Borders removed. Press Save photo to keep it.';
  }
  if (act === 'frame') {
    edMsg.textContent = 'Looking for people and the logo… (the first time takes a few seconds)';
    b.disabled = true;
    try {
      const r = await autoFrame(ed.source);
      ed.aspect = r.frame.fill ? null : 1; ed.fill = r.frame.fill;
      setCropPx({x: r.trimmed.x + r.frame.box.x, y: r.trimmed.y + r.frame.box.y, w: r.frame.box.w, h: r.frame.box.h});
      const what = [r.people && `${r.people} ${r.people > 1 ? 'people' : 'person'}`, r.logo && 'the logo'].filter(Boolean).join(' and ');
      edMsg.textContent = what
        ? `Framed ${what}.` + (r.frame.fill ? ' Everyone didn\'t fit in a square, so the gaps get a soft background.' : '') + ' Drag the box to adjust.'
        : 'No people or logo found, so it picked the most interesting area. Drag the box to adjust.';
    } catch (err) { edMsg.textContent = err.message; }
    b.disabled = false;
  }
  if (act === 'save') {
    b.disabled = true; edMsg.textContent = 'Saving…';
    try {
      const W = ed.source.width, H = ed.source.height;
      const box = {x: Math.round(ed.crop.x * W), y: Math.round(ed.crop.y * H), w: Math.max(1, Math.round(ed.crop.w * W)), h: Math.max(1, Math.round(ed.crop.h * H))};
      let out;
      if (ed.fill) out = renderSquare(ed.source, box, filterCss());
      else {
        out = Object.assign(document.createElement('canvas'), {width: box.w, height: box.h});
        const x = out.getContext('2d');
        x.filter = filterCss();
        x.drawImage(ed.source, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
      }
      const blob = await canvasBlob(out);
      const src = await upload(new File([blob], 'edited.jpg', {type: 'image/jpeg'}), 1800, {trim: false});
      replaceSrc(ed.photo, src);
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

/* ---------- Bulk tools. They always work from the originals, so running them again never stacks crops. ---------- */
const autoTrimKey = 'lumin-auto-trim';
function autoTrimOn() { try { return localStorage.getItem(autoTrimKey) !== 'off'; } catch { return true; } }
function setAutoTrim(on) { try { localStorage.setItem(autoTrimKey, on ? 'on' : 'off'); } catch {} }
const bulkTargets = () => {
  const pool = typeof selected !== 'undefined' && selected.size ? state.photos.filter(p => selected.has(p.id)) : state.photos;
  return pool.filter(p => !/\.(svg|gif)$/i.test(p.src));
};
const scopeLabel = () => typeof selected !== 'undefined' && selected.size ? 'selected photos' : 'photos';
function finishBulk(count, verbText, extra = '') {
  if (count) { changed(); render(); setStatus(`${verbText} ${count} photo${count > 1 ? 's' : ''}${extra}. Press ${verb()} changes to keep them, or Restore originals to undo.`, 'dirty'); }
  else setStatus(`Nothing to change${extra}.`, dirty ? 'dirty' : '');
}

async function fixAllBorders(button) {
  const list = bulkTargets();
  let fixed = 0, done = 0;
  button.disabled = true;
  for (const p of list) {
    setStatus(`Checking ${scopeLabel()} for borders… ${++done} of ${list.length}`, 'saving');
    try {
      const img = await loadImage(view(originalOf(p)));
      const box = findBorders(img);
      if (!box) continue;
      const blob = await canvasBlob(cropCanvas(img, box));
      replaceSrc(p, await upload(new File([blob], 'trimmed.jpg', {type: 'image/jpeg'}), 1800, {trim: false}));
      fixed++;
    } catch { /* skip photos that can't be read */ }
  }
  button.disabled = false;
  finishBulk(fixed, 'Removed borders from');
}

async function smartCropAll(button) {
  const list = bulkTargets();
  let cropped = 0, done = 0, failed = 0;
  button.disabled = true;
  setStatus('Loading the AI model…', 'saving');
  try { await loadDetector(); } catch (e) { setStatus(e.message, 'error'); button.disabled = false; return; }
  for (const p of list) {
    setStatus(`AI framing ${scopeLabel()}… ${++done} of ${list.length}`, 'saving');
    try {
      const img = await loadImage(view(originalOf(p)));
      const r = await autoFrame(img);
      const square = renderSquare(r.base, r.frame.box);
      replaceSrc(p, await upload(new File([await canvasBlob(square)], 'framed.jpg', {type: 'image/jpeg'}), 1800, {trim: false}));
      cropped++;
    } catch { failed++; }
  }
  button.disabled = false;
  finishBulk(cropped, 'AI-framed', failed ? ` (${failed} couldn't be read)` : '');
}

function restoreAll() {
  const list = bulkTargets().filter(p => p.original && p.src !== p.original);
  if (!list.length) return setStatus('These photos are already the originals.');
  if (!confirm(`Restore ${list.length} photo${list.length > 1 ? 's' : ''} to the original upload?`)) return;
  list.forEach(restoreOriginal);
  finishBulk(list.length, 'Restored');
}

/* ---------- Photo viewer: flip through every photo, edit or delete from there ---------- */
const viewerStyle = document.createElement('style');
viewerStyle.textContent = `
  .photo img.open-viewer { cursor: zoom-in; }
  #viewer { width: min(1000px, 100% - 24px); background: #0d2150; color: #fff; }
  #viewer .dialog-head { background: #0d2150; border-color: #ffffff22; color: #fff; }
  #viewer .dialog-head h2 { color: #fff; font-size: 1.05rem; }
  .vw-stage { position: relative; display: grid; place-items: center; height: min(68vh, 720px); padding: 10px 70px; overflow: hidden; }
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
    <button class="btn small" data-vw="restore">↺ Restore original</button>
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
  const edited = p.original && p.src !== p.original;
  viewer.querySelector('#vw-info').textContent = (edited ? 'Edited · ' : '') + (p.wall !== false ? 'In the moving wall' : 'Not in the moving wall') + (used.length ? ' · Pinned: ' + used.join(', ') : '');
  viewer.querySelector('[data-vw="wall"]').textContent = p.wall !== false ? 'Remove from moving wall' : 'Add to moving wall';
  viewer.querySelector('[data-vw="restore"]').hidden = !edited;
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
  if (act === 'restore' && restoreOriginal(p)) { changed(); render(); showViewer(); }
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
