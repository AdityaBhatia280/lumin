'use strict';
// Team tab: names, titles and photos for the Our Team page. Uses globals from admin.js.
const teamInput = Object.assign(document.createElement('input'), {type: 'file', accept: 'image/*', hidden: true});
document.body.append(teamInput);
let teamTarget = null;

views.team = () => {
  state.team ||= [];
  return `<div class="intro"><div><h2>Team</h2><p>The people on the <b>Our Team</b> page. Upload a photo for each person (a close-up of the face works best; it's shown as a square). Without a photo, their initials show instead.</p></div>
      <button class="btn primary" data-team="add">+ Add person</button></div>
    ${state.team.map((m, i) => `<section class="card"><div class="card-head"><span class="rank">${i + 1}</span>
        <span class="mark" style="width:72px;height:72px;border-radius:16px">${m.photo ? `<img src="${esc(view(m.photo))}" alt="" style="object-fit:cover;padding:0">` : esc((m.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase())}</span>
        <h3>${esc(m.name || 'New person')}</h3>
        <button class="btn small" data-team="up" data-i="${i}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button>
        <button class="btn small" data-team="down" data-i="${i}" ${i === state.team.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button>
        <button class="btn small danger" data-team="delete" data-i="${i}">Remove</button></div>
      <div class="fields">
        <label class="field">Name<input data-team-field="name" data-i="${i}" value="${esc(m.name)}"></label>
        <label class="field">Title<input data-team-field="role" data-i="${i}" value="${esc(m.role || 'Co-Founder')}"></label>
        <div class="field wide" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <button class="btn small primary" data-team="photo" data-i="${i}">${m.photo ? 'Replace photo' : 'Upload photo'}</button>
          ${m.photo ? `<button class="btn small" data-team="edit" data-i="${i}">✎ Edit photo</button><button class="btn small" data-team="nophoto" data-i="${i}">Remove photo</button>` : ''}
          ${m.photoOriginal && m.photo !== m.photoOriginal ? `<button class="btn small" data-team="restore" data-i="${i}">↺ Restore original</button>` : ''}</div>
      </div></section>`).join('')}
    <p class="help">People appear in this order, in one row under Our Inspiration. Use ✎ Edit photo to crop, rotate, or auto-frame a face.</p>`;
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-team]');
  if (!b || !state) return;
  const i = Number(b.dataset.i), act = b.dataset.team, t = state.team;
  if (act === 'add') t.push({id: uid('member'), name: '', role: 'Co-Founder', photo: null});
  if (act === 'up' && i > 0) [t[i - 1], t[i]] = [t[i], t[i - 1]];
  if (act === 'down' && i < t.length - 1) [t[i + 1], t[i]] = [t[i], t[i + 1]];
  if (act === 'delete') { if (!confirm(`Remove ${t[i].name || 'this person'} from the team page?`)) return; forgetFile(t[i].photo); t.splice(i, 1); }
  if (act === 'edit') return openEditorFor(fieldTarget(t[i], 'photo', 'photoOriginal', {maxSide: 1000, shapes: [{label: 'Team card (square)', aspect: 1}]}));
  if (act === 'restore') { if (!restoreOriginal(fieldTarget(t[i], 'photo', 'photoOriginal'))) return; }
  if (act === 'nophoto') { forgetFile(t[i].photo); if (t[i].photoOriginal && t[i].photoOriginal !== t[i].photo) forgetFile(t[i].photoOriginal); t[i].photo = null; t[i].photoOriginal = null; }
  if (act === 'photo') { teamTarget = i; teamInput.value = ''; teamInput.click(); return; }
  changed(); render();
});
document.addEventListener('input', e => {
  const f = e.target.dataset.teamField;
  if (!f || !state) return;
  state.team[Number(e.target.dataset.i)][f] = e.target.value;
  if (f === 'name') e.target.closest('.card').querySelector('h3').textContent = e.target.value || 'New person';
  changed();
});
teamInput.addEventListener('change', async () => {
  const file = teamInput.files[0], m = state.team[teamTarget];
  if (!file || !m) return;
  try {
    const r = await editBeforeUpload(file, {maxSide: 1000, shapes: [{label: 'Team card (square)', aspect: 1}], title: `Edit ${m.name || 'team'} photo before uploading`});
    if (r.action === 'skip') return;
    setStatus('Uploading photo…', 'saving');
    const original = await upload(file, 1000, {trim: r.action !== 'save'});
    const src = r.action === 'save' ? await upload(new File([r.blob], 'edited.jpg', {type: r.blob.type}), 1000, {trim: false}) : original;
    forgetFile(m.photo);
    if (m.photoOriginal && m.photoOriginal !== m.photo) forgetFile(m.photoOriginal);
    m.photo = src; m.photoOriginal = src === original ? null : original; changed(); render();
  } catch (err) { setStatus(err.message, 'error'); }
});
