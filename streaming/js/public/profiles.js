// "¿Quién está viendo?": elegir, crear, editar y bloquear perfiles con PIN (incluye perfil infantil).
import { db, STAFF } from '../data/db.js';
import { $, toast, modal, confirm, escape } from '../../../assets/core/ui.js';
import { requireViewer } from '../shared/header.js';
import { profilesOf, setProfile } from '../shared/catalog.js';
import { pinPrompt } from '../shared/pin.js';

const { user } = await requireViewer({ needProfile: false });
if (STAFF.includes(user.role)) location.replace('app.html');
const AVAS = ['🦊', '🦉', '🐧', '🐻', '🦙', '🐬', '🦁', '🐼', '🐸', '🦄', '🐙', '🌋'];
const COLS = ['#2563eb', '#db2777', '#16a34a', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#e11d48'];
const qs = new URLSearchParams(location.search);
let managing = qs.get('manage') === '1';

function editProfile(p = null) {
  const d = p ? { ...p } : { name: '', avatar: AVAS[profilesOf(user).length % AVAS.length], color: COLS[profilesOf(user).length % COLS.length], kids: false, pin: '' };
  const m = modal({ title: p ? 'Editar perfil' : 'Agregar perfil', body: `<form class="stack" id="ef" novalidate>
      <div class="field"><label for="pn">Nombre</label><input class="input" id="pn" value="${escape(d.name)}" maxlength="16" required></div>
      <div class="field"><span class="label">Avatar</span><div class="ava-pick" id="ap">${AVAS.map(a => `<button type="button" class="${a === d.avatar ? 'on' : ''}" data-a="${a}" aria-label="Avatar ${a}">${a}</button>`).join('')}</div></div>
      <div class="field"><span class="label">Color</span><div class="ava-pick" id="cp">${COLS.map(c => `<button type="button" class="${c === d.color ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="Color"></button>`).join('')}</div></div>
      <label class="check"><input type="checkbox" id="pk" ${d.kids ? 'checked' : ''}> Perfil infantil (solo títulos TE y 7+)</label>
      <div class="field"><label for="pp">PIN del perfil (4 dígitos, opcional)</label><input class="input mono" id="pp" maxlength="4" inputmode="numeric" value="${escape(d.pin || '')}" placeholder="Sin PIN"></div>
    </form>`, foot: `${p ? '<button class="btn btn-danger" id="del">Eliminar</button>' : ''}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="save">Guardar</button>` });
  m.el.querySelector('#ap').onclick = e => { const b = e.target.closest('[data-a]'); if (!b) return; d.avatar = b.dataset.a; m.el.querySelectorAll('#ap button').forEach(x => x.classList.toggle('on', x === b)); };
  m.el.querySelector('#cp').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; d.color = b.dataset.c; m.el.querySelectorAll('#cp button').forEach(x => x.classList.toggle('on', x === b)); };
  m.el.querySelector('#save').onclick = () => {
    d.name = m.el.querySelector('#pn').value.trim(); d.kids = m.el.querySelector('#pk').checked; d.pin = m.el.querySelector('#pp').value.trim();
    if (!d.name) return toast('Ponle un nombre al perfil', 'warning');
    if (d.pin && !/^\d{4}$/.test(d.pin)) return toast('El PIN debe tener 4 dígitos', 'warning');
    if (p) db.update('profiles', p.id, { name: d.name, avatar: d.avatar, color: d.color, kids: d.kids, pin: d.pin });
    else db.insert('profiles', { userId: user.id, name: d.name, avatar: d.avatar, color: d.color, kids: d.kids, pin: d.pin, myList: [] });
    toast('Perfil guardado', 'success'); m.close();
  };
  m.el.querySelector('#del')?.addEventListener('click', async () => {
    if (profilesOf(user).length <= 1) return toast('Debe quedar al menos un perfil', 'warning');
    m.close();
    if (await confirm(`¿Eliminar el perfil ${p.name}? Se perderá su historial y su lista.`, { danger: true, ok: 'Eliminar' })) { db.query('progress', x => x.profileId === p.id).forEach(x => db.remove('progress', x.id)); db.remove('profiles', p.id); toast('Perfil eliminado'); }
  });
}

async function pick(p) {
  if (managing) return editProfile(p);
  if (p.pin && !(await pinPrompt(`Perfil de ${p.name} bloqueado`, v => v === p.pin))) return;
  setProfile(user, p.id);
  location.href = 'app.html#/';
}

function render() {
  const list = profilesOf(user);
  $('#main').innerHTML = `<div class="${managing ? 'editing' : ''}">
    <a class="logo-word" href="index.html" style="font-size:28px">Andes<b>+</b></a>
    <h1 style="margin-top:24px">${managing ? 'Administrar perfiles' : '¿Quién está viendo?'}</h1>
    ${['cancelada', 'morosa'].includes(user.subStatus) ? `<p class="badge badge-warning plain" style="white-space:normal">Tu suscripción está ${user.subStatus}. <a href="cuenta.html#plan">Reactívala</a> para seguir viendo.</p>` : ''}
    <div class="profiles">${list.map(p => `<button class="profile" data-p="${p.id}"><span class="p-ava" style="--av:${p.color}">${p.avatar}</span><span>${escape(p.name)}${managing ? ' ✏️' : ''}</span>${p.kids ? '<span class="badge badge-success">Infantil</span>' : ''}${p.pin ? '<span class="lock">🔒 PIN</span>' : ''}</button>`).join('')}
      ${list.length < 5 ? '<button class="profile" id="add"><span class="p-ava" style="--av:var(--surface-2)">＋</span><span>Agregar perfil</span></button>' : ''}</div>
    <div class="row" style="justify-content:center"><button class="btn ${managing ? 'btn-primary' : ''}" id="manage">${managing ? 'Listo' : 'Administrar perfiles'}</button><a class="btn btn-ghost" href="cuenta.html">Cuenta</a></div></div>`;
  $('#main').querySelectorAll('[data-p]').forEach(b => b.onclick = () => pick(db.get('profiles', b.dataset.p)));
  $('#add')?.addEventListener('click', () => editProfile());
  $('#manage').onclick = () => { managing = !managing; render(); };
}
db.subscribe(render);
render();
if (qs.get('pick')) { const p = db.get('profiles', qs.get('pick')); if (p && p.userId === user.id) pick(p); }
